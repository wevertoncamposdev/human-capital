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
import { CreatePeopleGroupParticipationDto } from './dto/create-people-group-participation.dto';
import { CreatePeopleGroupDto } from './dto/create-people-group.dto';
import { EndPeopleGroupParticipationDto } from './dto/end-people-group-participation.dto';
import { ListPeopleGroupParticipationsQueryDto } from './dto/list-people-group-participations-query.dto';
import { ListPeopleGroupsQueryDto } from './dto/list-people-groups-query.dto';
import { UpdatePeopleGroupDto } from './dto/update-people-group.dto';
import { PeopleGroupsService } from './people-groups.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('people-groups')
export class PeopleGroupsController {
  constructor(private readonly peopleGroups: PeopleGroupsService) {}

  @Get()
  @Permissions('people.read')
  async list(@CurrentUser() user: JwtUser, @Query() query: ListPeopleGroupsQueryDto) {
    return this.peopleGroups.listPeopleGroups(user.tenantId, query);
  }

  @Get(':id')
  @Permissions('people.read')
  async get(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.peopleGroups.getPeopleGroup(user.tenantId, id);
  }

  @Post()
  @Permissions('people.create')
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreatePeopleGroupDto) {
    return this.peopleGroups.createPeopleGroup(user.tenantId, dto);
  }

  @Patch(':id')
  @Permissions('people.update')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePeopleGroupDto,
  ) {
    return this.peopleGroups.updatePeopleGroup(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('people.delete')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.peopleGroups.deletePeopleGroup(user.tenantId, id);
  }

  @Get(':id/participations')
  @Permissions('people.read')
  async listParticipations(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListPeopleGroupParticipationsQueryDto,
  ) {
    return this.peopleGroups.listPeopleGroupParticipations(user.tenantId, id, query);
  }

  @Post(':id/participations')
  @Permissions('people.update')
  async createParticipation(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePeopleGroupParticipationDto,
  ) {
    return this.peopleGroups.createPeopleGroupParticipation(user.tenantId, id, dto);
  }

  @Patch(':id/participations/:participationId/end')
  @Permissions('people.update')
  async endParticipation(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('participationId', new ParseUUIDPipe({ version: '4' })) participationId: string,
    @Body() dto: EndPeopleGroupParticipationDto,
  ) {
    return this.peopleGroups.endPeopleGroupParticipation(
      user.tenantId,
      id,
      participationId,
      dto,
    );
  }
}
