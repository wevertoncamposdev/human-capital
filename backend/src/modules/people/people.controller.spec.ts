import { Test, TestingModule } from '@nestjs/testing';
import { PeopleService } from './people.service';
import { PeopleController } from './people.controller';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';

describe('PeopleController', () => {
  let controller: PeopleController;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [PeopleController],
      providers: [{ provide: PeopleService, useValue: {} as PeopleService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();

    controller = module.get<PeopleController>(PeopleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
