import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../../modules/users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MfaController } from './mfa/mfa.controller';
import { MfaCryptoService } from './mfa/mfa-crypto.service';
import { MfaTotpService } from './mfa/mfa-totp.service';
import { TotpService } from './mfa/totp.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EmailModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    JwtStrategy,
    TotpService,
    MfaCryptoService,
    MfaTotpService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
