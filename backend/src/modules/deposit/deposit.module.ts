import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DepositController } from './deposit.controller';
import { DepositService } from './deposit.service';

@Module({
  imports: [PrismaModule],
  controllers: [DepositController],
  providers: [DepositService],
})
export class DepositModule {}

