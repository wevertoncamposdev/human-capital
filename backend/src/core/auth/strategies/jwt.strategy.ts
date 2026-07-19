import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthTokenPayload } from '../types/auth-token-payload';

export type JwtUser = {
  userId: string;
  tenantId: string;
  tenantSlug?: string | null;
  email: string;
  name?: string | null;
  tenantName?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: AuthTokenPayload): Promise<JwtUser> {
    if (!payload?.sub || !payload.tenantId) {
      throw new UnauthorizedException('Token invalido');
    }

    const requestTenantId = (req as Request & { tenantId?: string }).tenantId;
    if (requestTenantId && requestTenantId !== payload.tenantId) {
      throw new UnauthorizedException('Token nao pertence a instituicao');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug ?? null,
      email: payload.email,
      name: payload.name ?? null,
      tenantName: payload.tenantName ?? null,
    };
  }
}

