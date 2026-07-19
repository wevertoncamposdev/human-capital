import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} as UsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
