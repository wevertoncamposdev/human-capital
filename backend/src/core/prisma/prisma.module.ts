import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestContextModule } from '../request-context/request-context.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule, RequestContextModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
