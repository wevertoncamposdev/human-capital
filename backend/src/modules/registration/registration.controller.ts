import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RegistrationService } from './registration.service';
import { RequestTenantRegistrationDto } from './dto/request-tenant-registration.dto';
import { ConfirmTenantRegistrationDto } from './dto/confirm-tenant-registration.dto';
import { getCookieOptions } from '../../core/auth/http/auth-http';
import { RateLimit } from '../../core/rate-limit/rate-limit.decorator';

function getRequestMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly service: RegistrationService,
    private readonly config: ConfigService,
  ) {}

  @Post('tenant/request')
  @RateLimit({
    name: 'registration.tenant.request',
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyParts: ['ip', 'path', 'method'],
  })
  async requestTenant(@Body() dto: RequestTenantRegistrationDto) {
    return this.service.requestEmailRegistration(dto);
  }

  @Get('tenant/:id')
  async getRegistration(@Param('id') id: string) {
    return this.service.getRegistration(id);
  }

  @Post('tenant/confirm')
  @RateLimit({
    name: 'registration.tenant.confirm',
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyParts: ['ip', 'path', 'method'],
  })
  async confirmTenant(
    @Body() dto: ConfirmTenantRegistrationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, tenantSlug } =
      await this.service.confirmRegistration(dto, getRequestMeta(req));
    res.cookie('refresh_token', refreshToken, getCookieOptions());
    return { accessToken, tenantSlug };
  }

  @Get('oauth/google/start')
  @Redirect()
  async startGoogle(@Query('tenantName') tenantName?: string) {
    if (!tenantName) return { url: '/' };
    const { redirectUrl } = await this.service.startOAuth('google', tenantName);
    return { url: redirectUrl };
  }

  @Get('oauth/google/callback')
  @Redirect()
  async googleCallback(@Query() query: any) {
    const { registrationId } = await this.service.handleOAuthCallback(
      'google',
      {
        code: query?.code,
        state: query?.state,
        error: query?.error,
      },
    );
    const webUrl =
      this.config.get<string>('WEB_URL')?.trim() ?? 'http://localhost';
    return {
      url: `${webUrl}/register/confirm?rid=${encodeURIComponent(registrationId)}`,
    };
  }

  @Get('oauth/microsoft/start')
  @Redirect()
  async startMicrosoft(@Query('tenantName') tenantName?: string) {
    if (!tenantName) return { url: '/' };
    const { redirectUrl } = await this.service.startOAuth(
      'microsoft',
      tenantName,
    );
    return { url: redirectUrl };
  }

  @Get('oauth/microsoft/callback')
  @Redirect()
  async microsoftCallback(@Query() query: any) {
    const { registrationId } = await this.service.handleOAuthCallback(
      'microsoft',
      {
        code: query?.code,
        state: query?.state,
        error: query?.error,
      },
    );
    const webUrl =
      this.config.get<string>('WEB_URL')?.trim() ?? 'http://localhost';
    return {
      url: `${webUrl}/register/confirm?rid=${encodeURIComponent(registrationId)}`,
    };
  }
}
