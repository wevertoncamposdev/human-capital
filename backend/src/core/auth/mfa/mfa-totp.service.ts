import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthRequestMeta } from '../http/auth-http';
import {
  MFA_CHALLENGE_TTL_MINUTES,
  MFA_MAX_ATTEMPTS,
  MFA_SETUP_TTL_MINUTES,
  TRUSTED_DEVICE_DAYS,
} from './mfa.constants';
import { MfaCryptoService } from './mfa-crypto.service';
import { TotpService } from './totp.service';

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
}

function isRecoveryCode(value: string) {
  const normalized = normalizeRecoveryCode(value);
  return /^[A-Z2-7]{10}$/.test(normalized);
}

function generateRecoveryCode() {
  const raw = randomBytes(8).toString('base64url').slice(0, 10);
  // map base64url charset to base32-friendly (A-Z2-7) for easier typing
  const cleaned = raw
    .toUpperCase()
    .replace(/0/g, 'A')
    .replace(/1/g, 'B')
    .replace(/8/g, 'C')
    .replace(/9/g, 'D')
    .replace(/_/g, 'E')
    .replace(/-/g, 'F');
  const normalized = cleaned.replace(/[^A-Z2-7]/g, 'G').slice(0, 10);
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

@Injectable()
export class MfaTotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly crypto: MfaCryptoService,
    private readonly config: ConfigService,
  ) {}

  async createSetup(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, email: true, mfaTotpEnabled: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.mfaTotpEnabled) {
      throw new BadRequestException('2FA já está ativado para este usuário');
    }

    await this.prisma.userMfaTotpSetup.deleteMany({
      where: { userId, tenantId },
    });

    const secret = this.totp.generateSecret();
    const secretEnc = this.crypto.encryptToString(secret);
    const expiresAt = minutesFromNow(MFA_SETUP_TTL_MINUTES);
    const setup = await this.prisma.userMfaTotpSetup.create({
      data: { tenantId, userId, secretEnc, expiresAt },
      select: { id: true, expiresAt: true },
    });

    const issuer = this.config.get<string>('APP_NAME') ?? 'Terceiro Gestor';
    const otpauthUrl = this.totp.buildOtpauthUrl({
      issuer,
      accountName: user.email,
      secret,
    });

    return {
      setupId: setup.id,
      secret,
      otpauthUrl,
      expiresAt: setup.expiresAt,
    };
  }

  async confirmSetup(params: {
    tenantId: string;
    userId: string;
    setupId: string;
    code: string;
  }) {
    const setup = await this.prisma.userMfaTotpSetup.findFirst({
      where: { id: params.setupId, tenantId: params.tenantId, userId: params.userId },
    });
    if (!setup) {
      throw new BadRequestException('Configuração de 2FA não encontrada');
    }
    if (setup.expiresAt <= new Date()) {
      throw new BadRequestException('Configuração de 2FA expirada. Gere um novo QR.');
    }

    const secret = this.crypto.decryptFromString(setup.secretEnc);
    const ok = this.totp.verifyCode(secret, params.code);
    if (!ok) {
      throw new UnauthorizedException('Código inválido');
    }

    const recoveryCodes = Array.from({ length: 10 }).map(generateRecoveryCode);
    const recoveryRows = recoveryCodes.map((code) => ({
      tenantId: params.tenantId,
      userId: params.userId,
      codeHash: sha256Hex(normalizeRecoveryCode(code)),
    }));

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: params.userId },
        data: {
          mfaTotpEnabled: true,
          mfaTotpSecretEnc: setup.secretEnc,
          mfaTotpVerifiedAt: new Date(),
        },
      }),
      this.prisma.userMfaTotpSetup.deleteMany({
        where: { tenantId: params.tenantId, userId: params.userId },
      }),
      this.prisma.userMfaRecoveryCode.deleteMany({
        where: { tenantId: params.tenantId, userId: params.userId },
      }),
      this.prisma.userMfaRecoveryCode.createMany({
        data: recoveryRows,
        skipDuplicates: true,
      }),
    ]);

    return { recoveryCodes };
  }

  async disableTotp(params: { tenantId: string; userId: string; code: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: params.userId, tenantId: params.tenantId },
      select: { mfaTotpEnabled: true, mfaTotpSecretEnc: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.mfaTotpEnabled || !user.mfaTotpSecretEnc) {
      throw new BadRequestException('2FA não está ativado');
    }

    const secret = this.crypto.decryptFromString(user.mfaTotpSecretEnc);
    const ok = this.totp.verifyCode(secret, params.code);
    if (!ok) throw new UnauthorizedException('Código inválido');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: params.userId },
        data: {
          mfaTotpEnabled: false,
          mfaTotpSecretEnc: null,
          mfaTotpVerifiedAt: null,
        },
      }),
      this.prisma.userMfaRecoveryCode.deleteMany({
        where: { tenantId: params.tenantId, userId: params.userId },
      }),
      this.prisma.userTrustedDevice.updateMany({
        where: { tenantId: params.tenantId, userId: params.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.userMfaChallenge.deleteMany({
        where: { tenantId: params.tenantId, userId: params.userId },
      }),
    ]);

    return { ok: true };
  }

  async isTrustedDeviceValid(params: {
    tenantId: string;
    userId: string;
    token: string | null;
  }) {
    if (!params.token) return false;
    const tokenHash = sha256Hex(params.token);
    const now = new Date();

    const device = await this.prisma.userTrustedDevice.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    if (!device) return false;

    await this.prisma.userTrustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  async createChallenge(params: { tenantId: string; userId: string }) {
    const challenge = await this.prisma.userMfaChallenge.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: 'TOTP',
        expiresAt: minutesFromNow(MFA_CHALLENGE_TTL_MINUTES),
      },
      select: { id: true, expiresAt: true },
    });
    return challenge;
  }

  async verifyChallenge(params: {
    tenantId: string;
    challengeId: string;
    code: string;
  }) {
    const now = new Date();
    const challenge = await this.prisma.userMfaChallenge.findFirst({
      where: { id: params.challengeId, tenantId: params.tenantId },
      select: {
        id: true,
        userId: true,
        attempts: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
      throw new BadRequestException('Desafio expirado. Faça login novamente.');
    }
    if (challenge.attempts >= MFA_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Muitas tentativas. Faça login novamente.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: challenge.userId, tenantId: params.tenantId },
      select: { id: true, tenantId: true, mfaTotpEnabled: true, mfaTotpSecretEnc: true },
    });
    if (!user || !user.mfaTotpEnabled || !user.mfaTotpSecretEnc) {
      throw new UnauthorizedException('2FA não está configurado');
    }

    const code = String(params.code ?? '').trim();
    const secret = this.crypto.decryptFromString(user.mfaTotpSecretEnc);

    const isTotpOk = this.totp.verifyCode(secret, code);
    const isRecovery = !isTotpOk && isRecoveryCode(code);

    if (!isTotpOk && !isRecovery) {
      await this.prisma.userMfaChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Código inválido');
    }

    if (isRecovery) {
      const normalized = normalizeRecoveryCode(code);
      const codeHash = sha256Hex(normalized);
      const recovery = await this.prisma.userMfaRecoveryCode.findFirst({
        where: {
          tenantId: params.tenantId,
          userId: user.id,
          codeHash,
          usedAt: null,
        },
        select: { id: true },
      });
      if (!recovery) {
        await this.prisma.userMfaChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        throw new UnauthorizedException('Código inválido');
      }
      await this.prisma.userMfaRecoveryCode.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      });
    }

    await this.prisma.userMfaChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return { userId: user.id, tenantId: user.tenantId };
  }

  async rememberDevice(params: {
    tenantId: string;
    userId: string;
    meta?: AuthRequestMeta;
  }) {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = sha256Hex(token);
    const expiresAt = daysFromNow(TRUSTED_DEVICE_DAYS);
    await this.prisma.userTrustedDevice.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        tokenHash,
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
        lastUsedAt: new Date(),
        expiresAt,
      },
    });
    return { token, expiresAt };
  }
}
