import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { JwtUser } from '../strategies/jwt.strategy';
import {
  getCookieOptions,
  getRequestMeta,
  REFRESH_COOKIE_NAME,
} from '../http/auth-http';
import {
  TRUSTED_DEVICE_COOKIE_NAME,
  TRUSTED_DEVICE_DAYS,
} from './mfa.constants';
import { ConfirmTotpDto } from './dto/confirm-totp.dto';
import { DisableTotpDto } from './dto/disable-totp.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { MfaTotpService } from './mfa-totp.service';

function getTrustedDeviceCookieOptions() {
  return {
    ...getCookieOptions(),
    maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
  };
}

@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaTotp: MfaTotpService,
    private readonly authService: AuthService,
  ) {}

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard)
  async setupTotp(@CurrentUser() user: JwtUser) {
    return this.mfaTotp.createSetup(user.userId, user.tenantId);
  }

  @Post('totp/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmTotp(@CurrentUser() user: JwtUser, @Body() dto: ConfirmTotpDto) {
    return this.mfaTotp.confirmSetup({
      tenantId: user.tenantId,
      userId: user.userId,
      setupId: dto.setupId,
      code: dto.code,
    });
  }

  @Post('totp/disable')
  @UseGuards(JwtAuthGuard)
  async disableTotp(@CurrentUser() user: JwtUser, @Body() dto: DisableTotpDto) {
    return this.mfaTotp.disableTotp({
      tenantId: user.tenantId,
      userId: user.userId,
      code: dto.code,
    });
  }

  @Post('totp/verify')
  async verifyTotp(
    @Body() dto: VerifyMfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const requestTenantId = (req as Request & { tenantId?: string }).tenantId;
    if (!requestTenantId) {
      // MFA verify should always be tenant-scoped via /t/:slug
      throw new BadRequestException('Instituição inválida');
    }

    const meta = getRequestMeta(req);
    const verified = await this.mfaTotp.verifyChallenge({
      tenantId: requestTenantId,
      challengeId: dto.challengeId,
      code: dto.code,
    });

    const { accessToken, refreshToken } =
      await this.authService.createSessionForUser(
        verified.userId,
        requestTenantId,
        meta,
      );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

    if (dto.rememberDevice) {
      const remembered = await this.mfaTotp.rememberDevice({
        tenantId: requestTenantId,
        userId: verified.userId,
        meta,
      });
      res.cookie(
        TRUSTED_DEVICE_COOKIE_NAME,
        remembered.token,
        getTrustedDeviceCookieOptions(),
      );
    }

    return { accessToken };
  }
}
