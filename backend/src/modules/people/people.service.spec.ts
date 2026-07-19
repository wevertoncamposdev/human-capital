import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CepService } from '../../core/cep/cep.service';
import { PiiCryptoService } from '../../core/pii/pii-crypto.service';
import { RequestContextService } from '../../core/request-context/request-context.service';
import { PeopleService } from './people.service';

describe('PeopleService', () => {
  let service: PeopleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: PrismaService, useValue: {} as PrismaService },
        { provide: CepService, useValue: {} as CepService },
        { provide: PiiCryptoService, useValue: {} as PiiCryptoService },
        { provide: RequestContextService, useValue: {} as RequestContextService },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
