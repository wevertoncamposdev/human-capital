import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { AccessLogAction } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../../modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokenPayload } from './types/auth-token-payload';
import type { JwtUser } from './strategies/jwt.strategy';
import type { AuthRequestMeta } from './http/auth-http';
import { MfaTotpService } from './mfa/mfa-totp.service';
import { EmailService } from '../email/email.service';
import { buildPasswordResetEmail } from '../email/templates/password-reset';

const REFRESH_TOKEN_DAYS = 14;
const PASSWORD_RESET_MINUTES = 30;

type LoginSuccessResult = {
  mfaRequired: false;
  accessToken: string;
  refreshToken: string;
};
type LoginMfaRequiredResult = {
  mfaRequired: true;
  challengeId: string;
  expiresAt: Date;
};
export type LoginResult = LoginSuccessResult | LoginMfaRequiredResult;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mfaTotp: MfaTotpService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(tenantId: string, email: string, password: string) {
    const user = await this.usersService.findByEmailAndTenant(tenantId, email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return user;
  }

  async login(dto: LoginDto) {
    return this.loginWithMeta(dto);
  }

  async loginWithMeta(
    dto: LoginDto,
    meta?: AuthRequestMeta,
    expectedTenantId?: string,
    trustedDeviceToken?: string | null,
  ): Promise<LoginResult> {
    if (expectedTenantId && dto.tenantId && dto.tenantId !== expectedTenantId) {
      throw new UnauthorizedException('Instituição inválida');
    }
    const tenantId = expectedTenantId ?? dto.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Instituição inválida');
    }

    const user = await this.validateUser(tenantId, dto.email, dto.password);

    const isTotpEnabled = Boolean(user.mfaTotpEnabled && user.mfaTotpSecretEnc);
    if (isTotpEnabled) {
      const trustedOk = await this.mfaTotp.isTrustedDeviceValid({
        tenantId: user.tenantId,
        userId: user.id,
        token: trustedDeviceToken ?? null,
      });
      if (!trustedOk) {
        const challenge = await this.mfaTotp.createChallenge({
          tenantId: user.tenantId,
          userId: user.id,
        });
        return {
          mfaRequired: true,
          challengeId: challenge.id,
          expiresAt: challenge.expiresAt,
        };
      }
    }

    return this.createLoginSessionForUser(user.id, tenantId, meta);
  }

  async createSessionForUser(
    userId: string,
    tenantId: string,
    meta?: AuthRequestMeta,
  ): Promise<LoginSuccessResult> {
    return this.createLoginSessionForUser(userId, tenantId, meta);
  }

  private async createLoginSessionForUser(
    userId: string,
    expectedTenantId: string,
    meta?: AuthRequestMeta,
  ): Promise<LoginSuccessResult> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (user.tenantId !== expectedTenantId) {
      throw new UnauthorizedException('Instituição inválida');
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
    const refreshToken = this.createRefreshToken();
    const expiresAt = this.buildRefreshExpiration();
    await this.prisma.userSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        updatedAt: new Date(),
      },
    });
    await this.createAccessLog(user.id, user.tenantId, 'LOGIN', meta);

    return { mfaRequired: false, accessToken, refreshToken };
  }

  async refresh(
    refreshToken: string,
    meta?: AuthRequestMeta,
    expectedTenantId?: string,
  ) {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: { tokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      await this.prisma.userSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reutilizado');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (expectedTenantId && user.tenantId !== expectedTenantId) {
      throw new UnauthorizedException('Instituição inválida');
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

    const nextRefreshToken = this.createRefreshToken();
    const expiresAt = this.buildRefreshExpiration();
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
    await this.prisma.userSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: this.hashToken(nextRefreshToken),
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await this.createAccessLog(user.id, user.tenantId, 'REFRESH', meta);

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async logout(
    refreshToken: string | null,
    user: JwtUser,
    meta?: AuthRequestMeta,
  ) {
    if (refreshToken) {
      await this.prisma.userSession.updateMany({
        where: {
          tokenHash: this.hashToken(refreshToken),
          userId: user.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    await this.createAccessLog(user.userId, user.tenantId, 'LOGOUT', meta);
  }

  async getAccessLogs(
    user: JwtUser,
    params: {
      page?: number;
      limit?: number;
      action?: AccessLogAction;
      search?: string;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit =
      params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 20;
    const skip = (page - 1) * limit;
    const action = params.action;
    const search = params.search?.trim();
    const searchAction = search ? search.toUpperCase() : undefined;
    const actionCandidate =
      searchAction === 'LOGIN' ||
      searchAction === 'REFRESH' ||
      searchAction === 'LOGOUT'
        ? (searchAction as AccessLogAction)
        : undefined;

    const where = {
      userId: user.userId,
      tenantId: user.tenantId,
      ...(action ? { action } : {}),
      ...(search
        ? {
            OR: [
              { ipAddress: { contains: search } },
              { userAgent: { contains: search } },
              ...(actionCandidate
                ? [{ action: { equals: actionCandidate } }]
                : []),
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.accessLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private createRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private buildRefreshExpiration() {
    return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createAccessLog(
    userId: string,
    tenantId: string,
    action: AccessLogAction,
    meta?: AuthRequestMeta,
  ) {
    await this.prisma.accessLog.create({
      data: {
        userId,
        tenantId,
        action,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });
  }

  async requestPasswordReset(
    input: {
      tenantId?: string;
      email: string;
      tenantSlug?: string | null;
    },
    meta?: AuthRequestMeta,
  ) {
    const tenantId = input.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Instituição inválida');
    }
    const email = input.email.trim();
    if (!email) {
      return { ok: true };
    }

    const user = await this.usersService.findByEmailAndTenant(tenantId, email);
    if (!user || !user.isActive) {
      return { ok: true };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });
    if (!tenant) {
      return { ok: true };
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PASSWORD_RESET_MINUTES * 60 * 1000,
    );

    await this.prisma.passwordResetToken.updateMany({
      where: {
        tenantId,
        userId: user.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        tenantId,
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    const webUrl =
      this.config.get<string>('WEB_URL')?.trim() ?? 'http://localhost';
    const resetUrl = `${webUrl}/${encodeURIComponent(
      tenant.slug,
    )}/reset-password?token=${encodeURIComponent(token)}`;

    const emailMessage = buildPasswordResetEmail({
      tenantName: tenant.name,
      resetUrl,
      expiresMinutes: PASSWORD_RESET_MINUTES,
    });

    await this.email.send({
      to: user.email,
      subject: emailMessage.subject,
      text: emailMessage.text,
      html: emailMessage.html,
    });

    return { ok: true };
  }

  async resetPassword(input: { token: string; password: string }) {
    const token = input.token.trim();
    if (!token) {
      throw new BadRequestException('Token inválido.');
    }

    const now = new Date();
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        user: { select: { id: true, isActive: true } },
      },
    });

    if (!record) {
      throw new BadRequestException('Token inválido ou expirado.');
    }
    if (!record.user?.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          tenantId: record.tenantId,
          userId: record.userId,
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      await tx.userSession.updateMany({
        where: {
          tenantId: record.tenantId,
          userId: record.userId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    });

    // Evita vazamento de detalhes; o token é one-time use.
    return { ok: true };
  }
}
