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
import { CreatePeopleSegmentMembershipDto } from './dto/create-people-segment-membership.dto';
import { CreatePeopleSegmentDto } from './dto/create-people-segment.dto';
import { EndPeopleSegmentMembershipDto } from './dto/end-people-segment-membership.dto';
import { ListPeopleSegmentMembershipsQueryDto } from './dto/list-people-segment-memberships-query.dto';
import { ListPeopleSegmentsQueryDto } from './dto/list-people-segments-query.dto';
import { UpdatePeopleSegmentDto } from './dto/update-people-segment.dto';
import { PeopleSegmentsService } from './people-segments.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('people-segments')
export class PeopleSegmentsController {
  constructor(private readonly peopleSegments: PeopleSegmentsService) {}

  @Get()
  @Permissions('people.read')
  async list(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPeopleSegmentsQueryDto,
  ) {
    return this.peopleSegments.listPeopleSegments(user.tenantId, query);
  }

  @Get(':id')
  @Permissions('people.read')
  async get(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.peopleSegments.getPeopleSegment(user.tenantId, id);
  }

  @Post()
  @Permissions('people.create')
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePeopleSegmentDto,
  ) {
    return this.peopleSegments.createPeopleSegment(user.tenantId, dto);
  }

  @Patch(':id')
  @Permissions('people.update')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePeopleSegmentDto,
  ) {
    return this.peopleSegments.updatePeopleSegment(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('people.delete')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.peopleSegments.deletePeopleSegment(user.tenantId, id);
  }

  @Get(':id/memberships')
  @Permissions('people.read')
  async listMemberships(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListPeopleSegmentMembershipsQueryDto,
  ) {
    return this.peopleSegments.listPeopleSegmentMemberships(user.tenantId, id, query);
  }

  @Post(':id/memberships')
  @Permissions('people.update')
  async createMembership(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePeopleSegmentMembershipDto,
  ) {
    return this.peopleSegments.createPeopleSegmentMembership(user.tenantId, id, dto);
  }

  @Patch(':id/memberships/:membershipId/end')
  @Permissions('people.update')
  async endMembership(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('membershipId', new ParseUUIDPipe({ version: '4' })) membershipId: string,
    @Body() dto: EndPeopleSegmentMembershipDto,
  ) {
    return this.peopleSegments.endPeopleSegmentMembership(
      user.tenantId,
      id,
      membershipId,
      dto,
    );
  }
}
