import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { ActionsService } from './actions.service';
import { ListProjectActionsQueryDto } from './dto/list-project-actions-query.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('actions')
export class ActionsListController {
  constructor(private readonly service: ActionsService) {}

  @Get()
  @Permissions('actions.read')
  async list(@CurrentUser() user: JwtUser, @Query() query: ListProjectActionsQueryDto) {
    return this.service.listActions(user, query);
  }
}
