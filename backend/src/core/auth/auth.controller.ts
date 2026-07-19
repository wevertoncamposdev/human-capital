import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import type { JwtUser } from './strategies/jwt.strategy';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  getCookie,
  getCookieOptions,
  getRequestMeta,
  REFRESH_COOKIE_NAME,
} from './http/auth-http';
import { TRUSTED_DEVICE_COOKIE_NAME } from './mfa/mfa.constants';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @RateLimit({
    name: 'auth.login',
    windowMs: 10 * 60 * 1000,
    max: 20,
    bodyField: 'email',
    keyParts: ['ip', 'tenantId', 'bodyField'],
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const requestTenantId = (req as Request & { tenantId?: string }).tenantId;
    const payload: LoginDto = {
      ...dto,
      tenantId: dto.tenantId ?? requestTenantId,
    };
    const trustedDeviceToken = getCookie(req, TRUSTED_DEVICE_COOKIE_NAME);
    const result = await this.authService.loginWithMeta(
      payload,
      getRequestMeta(req),
      requestTenantId,
      trustedDeviceToken,
    );

    if (result.mfaRequired) {
      return result;
    }

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());
    return { accessToken: result.accessToken };
  }

  @Post('forgot-password')
  @RateLimit({
    name: 'auth.forgotPassword',
    windowMs: 60 * 60 * 1000,
    max: 10,
    bodyField: 'email',
    keyParts: ['ip', 'tenantId', 'bodyField'],
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const tenantId = (req as Request & { tenantId?: string }).tenantId;
    const tenantSlug = (req as Request & { tenantSlug?: string }).tenantSlug;
    await this.authService.requestPasswordReset(
      { tenantId, tenantSlug, email: dto.email },
      getRequestMeta(req),
    );
    return { ok: true };
  }

  @Post('reset-password')
  @RateLimit({
    name: 'auth.resetPassword',
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyParts: ['ip', 'path', 'method'],
  })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword({
      token: dto.token,
      password: dto.password,
    });
    return { ok: true };
  }

  @Post('refresh')
  @RateLimit({
    name: 'auth.refresh',
    windowMs: 60 * 60 * 1000,
    max: 120,
    keyParts: ['ip', 'tenantId', 'path'],
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      return { accessToken: null };
    }
    const requestTenantId = (req as Request & { tenantId?: string }).tenantId;
    const { accessToken, refreshToken: nextRefresh } =
      await this.authService.refresh(
        refreshToken,
        getRequestMeta(req),
        requestTenantId,
      );
    res.cookie(REFRESH_COOKIE_NAME, nextRefresh, getCookieOptions());
    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: JwtUser,
  ) {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    await this.authService.logout(refreshToken, user, getRequestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, '', { ...getCookieOptions(), maxAge: 0 });
    return { ok: true };
  }

  @Get('access-logs')
  @UseGuards(JwtAuthGuard)
  async getAccessLogs(
    @CurrentUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    return this.authService.getAccessLogs(user, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action: action ? (action as 'LOGIN' | 'REFRESH' | 'LOGOUT') : undefined,
      search,
    });
  }
}
