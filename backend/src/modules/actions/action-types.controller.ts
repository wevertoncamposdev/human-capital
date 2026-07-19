import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { ActionsService } from './actions.service';
import { CreateActionTypeDto } from './dto/create-action-type.dto';
import { ListActionTypesQueryDto } from './dto/list-action-types-query.dto';
import { UpdateActionTypeDto } from './dto/update-action-type.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('action-types')
export class ActionTypesController {
  constructor(private readonly service: ActionsService) {}

  @Get()
  @Permissions('actions.read')
  async list(@CurrentUser() user: JwtUser, @Query() query: ListActionTypesQueryDto) {
    return this.service.listActionTypes(user.tenantId, query);
  }

  @Post()
  @Permissions('actions.create')
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateActionTypeDto) {
    return this.service.createActionType(user.tenantId, dto);
  }

  @Patch(':id')
  @Permissions('actions.update')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateActionTypeDto,
  ) {
    return this.service.updateActionType(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('actions.delete')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteActionType(user.tenantId, id);
  }
}

