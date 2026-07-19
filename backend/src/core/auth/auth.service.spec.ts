import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../../modules/users/users.service';
import { AuthService } from './auth.service';
import { MfaTotpService } from './mfa/mfa-totp.service';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} as UsersService },
        { provide: JwtService, useValue: {} as JwtService },
        { provide: PrismaService, useValue: {} as PrismaService },
        { provide: MfaTotpService, useValue: {} as MfaTotpService },
        { provide: EmailService, useValue: { send: jest.fn() } as any },
        { provide: ConfigService, useValue: { get: jest.fn() } as any },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
