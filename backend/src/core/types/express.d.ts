import { JwtUser } from '../auth/strategies/jwt.strategy';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
      tenantId?: string;
    }
  }
}

export {};
