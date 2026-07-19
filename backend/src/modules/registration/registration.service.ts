import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt, createHash } from 'crypto';
import type { AccessLogAction, Prisma, TenantRegistrationMethod } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailService } from '../../core/email/email.service';
import { RequestContextService } from '../../core/request-context/request-context.service';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_DEFINITIONS, REGISTRATION_CODE_TTL_MINUTES } from './registration.constants';
import { slugify } from './registration.utils';
import { RequestTenantRegistrationDto } from './dto/request-tenant-registration.dto';
import { ConfirmTenantRegistrationDto } from './dto/confirm-tenant-registration.dto';
import { AuthTokenPayload } from '../../core/auth/types/auth-token-payload';
import { buildTenantRegistrationCodeEmail } from '../../core/email/templates/tenant-registration-code';

type OAuthProvider = 'google' | 'microsoft';

const RESERVED_TENANT_SLUGS = new Set([
  '',
  '_next',
  'api',
  'auth',
  'dashboard',
  'people',
  'settings',
  'admin',
  'login',
  'register',
  't',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly requestContext: RequestContextService,
  ) {}

  async requestEmailRegistration(dto: RequestTenantRegistrationDto) {
    const tenantName = dto.tenantName.trim();
    const tenantSlug = this.normalizeTenantSlug(dto.tenantSlug ?? slugify(tenantName));
    await this.ensureTenantNameIsFree(tenantName);

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const { code, codeHash, expiresAt } = await this.buildVerificationCode();

    const registration = await this.prisma.tenantRegistration.create({
      data: {
        method: 'EMAIL',
        status: 'PENDING_VERIFICATION',
        tenantName,
        tenantSlug,
        adminName: dto.adminName.trim(),
        adminEmail: dto.adminEmail.trim().toLowerCase(),
        adminPasswordHash: passwordHash,
        verificationCodeHash: codeHash,
        verificationCodeExpiresAt: expiresAt,
      },
      select: { id: true },
    });

    await this.sendCodeEmail(dto.adminEmail, tenantName, code);

    return { registrationId: registration.id };
  }

  async getRegistration(registrationId: string) {
    const reg = await this.prisma.tenantRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!reg) {
      throw new NotFoundException('Registro nao encontrado');
    }
    return {
      id: reg.id,
      method: reg.method,
      status: reg.status,
      tenantName: reg.tenantName,
      tenantSlug: reg.tenantSlug,
      adminEmail: reg.adminEmail,
      adminName: reg.adminName,
      passwordRequired: !reg.adminPasswordHash,
      codeExpiresAt: reg.verificationCodeExpiresAt,
    };
  }

  async confirmRegistration(
    dto: ConfirmTenantRegistrationDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const reg = await this.prisma.tenantRegistration.findUnique({
      where: { id: dto.registrationId },
    });
    if (!reg) throw new NotFoundException('Registro nao encontrado');
    if (reg.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException('Registro nao esta aguardando confirmacao');
    }
    if (!reg.adminEmail) throw new BadRequestException('Email do admin nao definido');
    if (!reg.adminName) throw new BadRequestException('Nome do admin nao definido');
    const adminEmail = reg.adminEmail;
    const adminName = reg.adminName;
    if (!reg.verificationCodeHash || !reg.verificationCodeExpiresAt) {
      throw new BadRequestException('Codigo nao disponivel');
    }
    if (reg.verificationCodeExpiresAt <= new Date()) {
      throw new BadRequestException('Codigo expirado');
    }

    const codeOk = await bcrypt.compare(dto.code.trim(), reg.verificationCodeHash);
    if (!codeOk) throw new BadRequestException('Codigo invalido');

    const adminPasswordHash = reg.adminPasswordHash ?? (dto.password ? await bcrypt.hash(dto.password, 10) : null);
    if (!adminPasswordHash) {
      throw new BadRequestException('Defina uma senha para continuar');
    }

    // Evita deadlock/timeout: durante a criação inicial do tenant, o AuditLog
    // não pode ser inserido fora da transação porque o Tenant ainda não está commitado.
    this.requestContext.update({ disableAudit: true });

    const result = await this.prisma.$transaction(
      async (tx) => {
        await this.ensureCorePermissions(tx);
        const tenant = await this.createTenantWithUniqueSlug(tx, reg.tenantName, reg.tenantSlug);
        const { rolesByName } = await this.createDefaultRoles(tx, tenant.id);
        await this.createDefaultRolePermissions(tx, tenant.id, rolesByName);

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: adminName,
            email: adminEmail,
            passwordHash: adminPasswordHash,
            isActive: true,
          },
          select: { id: true, tenantId: true },
        });

        const adminRole = rolesByName.get('Admin');
        if (adminRole) {
          await tx.userRole.create({
            data: { tenantId: tenant.id, userId: user.id, roleId: adminRole.id },
          });
        }

        await tx.tenantRegistration.update({
          where: { id: reg.id },
          data: {
            status: 'CONFIRMED',
            tenantId: tenant.id,
            adminUserId: user.id,
            confirmedAt: new Date(),
            tenantSlug: tenant.slug,
          },
        });

        return { tenantId: tenant.id, tenantSlug: tenant.slug, userId: user.id };
      },
      { timeout: 60000, maxWait: 20000 },
    );

    this.requestContext.update({ disableAudit: false, tenantId: result.tenantId, userId: result.userId });

    const tokens = await this.issueTokensForUser(result.userId, meta);
    return { ...result, ...tokens };
  }

  async startOAuth(provider: OAuthProvider, tenantName: string) {
    const cleanName = tenantName.trim();
    await this.ensureTenantNameIsFree(cleanName);
    const tenantSlug = this.normalizeTenantSlug(slugify(cleanName));

    const stateSecret = randomBytes(16).toString('base64url');
    const stateHash = this.hashValue(stateSecret);

    const method: TenantRegistrationMethod = provider === 'google' ? 'GOOGLE' : 'MICROSOFT';
    const registration = await this.prisma.tenantRegistration.create({
      data: {
        method,
        status: 'PENDING_OAUTH',
        tenantName: cleanName,
        tenantSlug,
        oauthStateHash: stateHash,
      },
      select: { id: true },
    });

    const state = `${registration.id}.${stateSecret}`;
    const redirectUrl =
      provider === 'google'
        ? this.buildGoogleAuthorizeUrl(state)
        : this.buildMicrosoftAuthorizeUrl(state);

    return { redirectUrl };
  }

  async handleOAuthCallback(
    provider: OAuthProvider,
    params: { code?: string; state?: string; error?: string },
  ) {
    if (params.error) {
      throw new BadRequestException(params.error);
    }
    const code = params.code?.trim();
    const state = params.state?.trim();
    if (!code || !state) {
      throw new BadRequestException('Callback invalido');
    }

    const [registrationId, stateSecret] = state.split('.', 2);
    if (!registrationId || !stateSecret) {
      throw new BadRequestException('State invalido');
    }

    const reg = await this.prisma.tenantRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!reg || reg.status !== 'PENDING_OAUTH' || !reg.oauthStateHash) {
      throw new NotFoundException('Registro nao encontrado');
    }
    if (this.hashValue(stateSecret) !== reg.oauthStateHash) {
      throw new BadRequestException('State invalido');
    }

    const profile =
      provider === 'google'
        ? await this.fetchGoogleProfile(code)
        : await this.fetchMicrosoftProfile(code);

    const { code: verifyCode, codeHash, expiresAt } = await this.buildVerificationCode();
    await this.prisma.tenantRegistration.update({
      where: { id: reg.id },
      data: {
        status: 'PENDING_VERIFICATION',
        adminEmail: profile.email,
        adminName: profile.name,
        oauthProviderSub: profile.sub,
        verificationCodeHash: codeHash,
        verificationCodeExpiresAt: expiresAt,
      },
    });

    await this.sendCodeEmail(profile.email, reg.tenantName, verifyCode);
    return { registrationId: reg.id };
  }

  private normalizeTenantSlug(slug: string) {
    const value = slugify(slug);
    if (RESERVED_TENANT_SLUGS.has(value)) {
      return `tenant-${value || 'app'}`;
    }
    return value;
  }

  private async ensureTenantNameIsFree(name: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { name } });
    if (existing) {
      throw new BadRequestException('Ja existe uma instituicao com esse nome');
    }
  }

  private async buildVerificationCode() {
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + REGISTRATION_CODE_TTL_MINUTES * 60 * 1000);
    return { code, codeHash, expiresAt };
  }

  private async sendCodeEmail(to: string, tenantName: string, code: string) {
    const message = buildTenantRegistrationCodeEmail({
      tenantName,
      code,
      expiresMinutes: REGISTRATION_CODE_TTL_MINUTES,
    });
    await this.email.send({ to, ...message });
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async ensureCorePermissions(tx: Prisma.TransactionClient) {
    await tx.permission.createMany({
      data: DEFAULT_PERMISSIONS.map((permission) => ({
        key: permission.key,
        description: permission.description,
      })),
      skipDuplicates: true,
    });
  }

  private async createTenantWithUniqueSlug(
    tx: Prisma.TransactionClient,
    tenantName: string,
    preferredSlug: string,
  ) {
    const base = this.normalizeTenantSlug(preferredSlug || slugify(tenantName));
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      try {
        const tenant = await tx.tenant.create({
          data: {
            name: tenantName,
            slug: candidate,
            status: 'ACTIVE',
          },
          select: { id: true, slug: true },
        });
        return tenant;
      } catch (error: any) {
        const isUniqueViolation =
          typeof error?.code === 'string' && (error.code === 'P2002' || error.code === 'P2000');
        if (!isUniqueViolation) throw error;
      }
    }
    throw new BadRequestException('Nao foi possivel gerar um slug unico');
  }

  private async createDefaultRoles(tx: Prisma.TransactionClient, tenantId: string) {
    const roles = new Map<string, { id: string; name: string }>();
    for (const roleDef of DEFAULT_ROLE_DEFINITIONS) {
      const role = await tx.role.create({
        data: {
          tenantId,
          name: roleDef.name,
          description: roleDef.description,
        },
        select: { id: true, name: true },
      });
      roles.set(role.name, role);
    }
    return { rolesByName: roles };
  }

  private async createDefaultRolePermissions(
    tx: Prisma.TransactionClient,
    tenantId: string,
    rolesByName: Map<string, { id: string; name: string }>,
  ) {
    const permissions = await tx.permission.findMany({
      select: { id: true, key: true },
    });
    const permissionsByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

    const entries: Array<{ tenantId: string; roleId: string; permissionId: string }> = [];
    for (const roleDef of DEFAULT_ROLE_DEFINITIONS) {
      const role = rolesByName.get(roleDef.name);
      if (!role) continue;
      for (const key of roleDef.permissionKeys) {
        const permissionId = permissionsByKey.get(key);
        if (!permissionId) continue;
        entries.push({ tenantId, roleId: role.id, permissionId });
      }
    }

    if (!entries.length) return;
    await tx.rolePermission.createMany({ data: entries, skipDuplicates: true });
  }

  private buildGoogleAuthorizeUrl(state: string) {
    const clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID')?.trim();
    const redirectUri = this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI')?.trim();
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Google OAuth nao configurado');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private buildMicrosoftAuthorizeUrl(state: string) {
    const clientId = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_ID')?.trim();
    const redirectUri = this.config.get<string>('MICROSOFT_OAUTH_REDIRECT_URI')?.trim();
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Microsoft OAuth nao configurado');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid email profile',
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private async fetchGoogleProfile(code: string) {
    const clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID')?.trim();
    const clientSecret = this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET')?.trim();
    const redirectUri = this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI')?.trim();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google OAuth nao configurado');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenPayload: any = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok) {
      throw new BadRequestException(tokenPayload?.error_description ?? 'Falha ao autenticar com Google');
    }

    const accessToken = tokenPayload?.access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new BadRequestException('Falha ao autenticar com Google');
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      throw new BadRequestException('Falha ao carregar perfil do Google');
    }

    const email = typeof profile?.email === 'string' ? profile.email.toLowerCase() : null;
    const name = typeof profile?.name === 'string' ? profile.name : null;
    const sub = typeof profile?.sub === 'string' ? profile.sub : null;
    if (!email || !sub) {
      throw new BadRequestException('Perfil do Google invalido');
    }
    return { email, name: name ?? email, sub };
  }

  private async fetchMicrosoftProfile(code: string) {
    const clientId = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_ID')?.trim();
    const clientSecret = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_SECRET')?.trim();
    const redirectUri = this.config.get<string>('MICROSOFT_OAUTH_REDIRECT_URI')?.trim();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Microsoft OAuth nao configurado');
    }

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenPayload: any = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok) {
      throw new BadRequestException(tokenPayload?.error_description ?? 'Falha ao autenticar com Microsoft');
    }

    const accessToken = tokenPayload?.access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new BadRequestException('Falha ao autenticar com Microsoft');
    }

    const profileResponse = await fetch('https://graph.microsoft.com/oidc/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      throw new BadRequestException('Falha ao carregar perfil do Microsoft');
    }

    const emailRaw =
      (typeof profile?.email === 'string' && profile.email) ||
      (typeof profile?.preferred_username === 'string' && profile.preferred_username) ||
      null;
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const name = typeof profile?.name === 'string' ? profile.name : null;
    const sub = typeof profile?.sub === 'string' ? profile.sub : null;
    if (!email || !sub) {
      throw new BadRequestException('Perfil do Microsoft invalido');
    }
    return { email, name: name ?? email, sub };
  }

  private async issueTokensForUser(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, email: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new BadRequestException('Usuario invalido');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, slug: true },
    });

    const payload: AuthTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      tenantSlug: tenant?.slug ?? null,
      email: user.email,
      name: user.name ?? null,
      tenantName: tenant?.name ?? null,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.userSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        updatedAt: new Date(),
      },
    });
    await this.prisma.accessLog.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        action: 'LOGIN' as AccessLogAction,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    return { accessToken, refreshToken };
  }
}
