import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CepModule } from '../../core/cep/cep.module';
import { PiiModule } from '../../core/pii/pii.module';
import { RequestContextModule } from '../../core/request-context/request-context.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  imports: [PrismaModule, CepModule, PiiModule, RequestContextModule],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class PeopleModule {}
