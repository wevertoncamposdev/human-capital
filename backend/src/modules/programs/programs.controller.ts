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
import { CreateProgramAttachmentDto } from './dto/create-program-attachment.dto';
import { CreateProgramCommentDto } from './dto/create-program-comment.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { ListProgramsQueryDto } from './dto/list-programs-query.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramsService } from './programs.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  @Permissions('programs.read')
  async list(@CurrentUser() user: JwtUser, @Query() query: ListProgramsQueryDto) {
    return this.programs.listPrograms(user.tenantId, query);
  }

  @Get(':id')
  @Permissions('programs.read')
  async get(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.programs.getProgram(user.tenantId, id);
  }

  @Post()
  @Permissions('programs.create')
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateProgramDto) {
    return this.programs.createProgram(user.tenantId, dto);
  }

  @Post(':id/comments')
  @Permissions('programs.update')
  async addComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateProgramCommentDto,
  ) {
    return this.programs.addComment(user.tenantId, user.userId, id, dto);
  }

  @Delete(':id/comments/:commentId')
  @Permissions('programs.update')
  async deleteComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.programs.deleteComment(user.tenantId, id, commentId);
  }

  @Post(':id/attachments')
  @Permissions('programs.update')
  async addAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateProgramAttachmentDto,
  ) {
    return this.programs.addAttachment(user.tenantId, user.userId, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @Permissions('programs.update')
  async deleteAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.programs.deleteAttachment(user.tenantId, id, attachmentId);
  }

  @Patch(':id')
  @Permissions('programs.update')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programs.updateProgram(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('programs.delete')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.programs.deleteProgram(user.tenantId, id);
  }
}

