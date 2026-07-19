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
import { CreateDepositDonorDto } from './dto/create-deposit-donor.dto';
import { CreateDepositDonorAttachmentDto } from './dto/create-deposit-donor-attachment.dto';
import { CreateDepositDonorCommentDto } from './dto/create-deposit-donor-comment.dto';
import { CreateDepositEntryDto } from './dto/create-deposit-entry.dto';
import { CreateDepositEntryAttachmentDto } from './dto/create-deposit-entry-attachment.dto';
import { CreateDepositEntryCommentDto } from './dto/create-deposit-entry-comment.dto';
import { CreateDepositExitDto } from './dto/create-deposit-exit.dto';
import { CreateDepositExitAttachmentDto } from './dto/create-deposit-exit-attachment.dto';
import { CreateDepositExitCommentDto } from './dto/create-deposit-exit-comment.dto';
import { CreateDepositItemDto } from './dto/create-deposit-item.dto';
import { CreateDepositItemAttachmentDto } from './dto/create-deposit-item-attachment.dto';
import { CreateDepositItemCommentDto } from './dto/create-deposit-item-comment.dto';
import { CreateDepositSectorDto } from './dto/create-deposit-sector.dto';
import { ListDepositDonorsQueryDto } from './dto/list-deposit-donors-query.dto';
import { ListDepositEntriesQueryDto } from './dto/list-deposit-entries-query.dto';
import { ListDepositExitsQueryDto } from './dto/list-deposit-exits-query.dto';
import { ListDepositItemsQueryDto } from './dto/list-deposit-items-query.dto';
import { UpdateDepositDonorDto } from './dto/update-deposit-donor.dto';
import { UpdateDepositEntryDto } from './dto/update-deposit-entry.dto';
import { UpdateDepositExitDto } from './dto/update-deposit-exit.dto';
import { UpdateDepositItemDto } from './dto/update-deposit-item.dto';
import { DepositService } from './deposit.service';
import { DepositConsumptionQueryDto } from './dto/deposit-consumption-query.dto';
import { ReverseDepositMovementDto } from './dto/reverse-deposit-movement.dto';
import { ListDepositHistoryQueryDto } from './dto/list-deposit-history-query.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('deposit')
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Get('summary')
  @Permissions('deposit.read')
  async getSummary(@CurrentUser() user: JwtUser) {
    return this.depositService.getSummary(user.tenantId);
  }

  @Get('dashboard')
  @Permissions('deposit.read')
  async getDashboard(@CurrentUser() user: JwtUser) {
    return this.depositService.getDashboard(user.tenantId);
  }

  @Get('history')
  @Permissions('deposit.read')
  async listHistory(
    @CurrentUser() user: JwtUser,
    @Query() query: ListDepositHistoryQueryDto,
  ) {
    return this.depositService.listHistory(user.tenantId, {
      page: query.page,
      limit: query.limit,
      all: query.all,
      kind: query.kind,
      search: query.search ?? query.q,
      itemId: query.itemId,
      type: query.type,
      destinationName: query.destinationName,
      from: query.from,
      to: query.to,
    });
  }

  @Get('sectors')
  @Permissions('deposit.read')
  async listSectors(@CurrentUser() user: JwtUser) {
    return this.depositService.listSectors(user.tenantId);
  }

  @Post('sectors')
  @Permissions('deposit.create')
  async createSector(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateDepositSectorDto,
  ) {
    return this.depositService.createSector(user.tenantId, dto);
  }

  @Get('consumption')
  @Permissions('deposit.read')
  async getConsumption(
    @CurrentUser() user: JwtUser,
    @Query() query: DepositConsumptionQueryDto,
  ) {
    return this.depositService.getConsumption(user.tenantId, query);
  }

  @Get('flow')
  @Permissions('deposit.read')
  async getFlow(
    @CurrentUser() user: JwtUser,
    @Query() query: DepositConsumptionQueryDto,
  ) {
    return this.depositService.getFlow(user.tenantId, query);
  }

  @Get('usage')
  @Permissions('deposit.read')
  async getUsage(
    @CurrentUser() user: JwtUser,
    @Query() query: DepositConsumptionQueryDto,
  ) {
    return this.depositService.getUsage(user.tenantId, query);
  }

  @Post('entries/:id/reverse')
  @Permissions('deposit.update')
  async reverseEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReverseDepositMovementDto,
  ) {
    return this.depositService.reverseEntry(user.tenantId, id, dto);
  }

  @Post('exits/:id/reverse')
  @Permissions('deposit.update')
  async reverseExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReverseDepositMovementDto,
  ) {
    return this.depositService.reverseExit(user.tenantId, id, dto);
  }

  @Get('items')
  @Permissions('deposit.read')
  async listItems(
    @CurrentUser() user: JwtUser,
    @Query() query: ListDepositItemsQueryDto,
  ) {
    return this.depositService.listItems(user.tenantId, query);
  }

  @Get('items/suggestions')
  @Permissions('deposit.read')
  async listItemSuggestions(@CurrentUser() user: JwtUser) {
    return this.depositService.listItemSuggestions(user.tenantId);
  }

  @Get('items/:id/sectors')
  @Permissions('deposit.read')
  async listItemSectors(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.listItemSectors(user.tenantId, id);
  }

  @Get('items/:id')
  @Permissions('deposit.read')
  async getItem(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.getItem(user.tenantId, id);
  }

  @Get('items/:id/audit')
  @Permissions('deposit.read')
  async listItemAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositService.listItemAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('items')
  @Permissions('deposit.create')
  async createItem(@CurrentUser() user: JwtUser, @Body() dto: CreateDepositItemDto) {
    return this.depositService.createItem(user.tenantId, dto);
  }

  @Post('items/:id/comments')
  @Permissions('deposit.read')
  async createItemComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositItemCommentDto,
  ) {
    return this.depositService.addItemComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('items/:id/comments/:commentId')
  @Permissions('deposit.read')
  async deleteItemComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.depositService.deleteItemComment(user.tenantId, id, commentId);
  }

  @Post('items/:id/attachments')
  @Permissions('deposit.read')
  async createItemAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositItemAttachmentDto,
  ) {
    return this.depositService.addItemAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('items/:id/attachments/:attachmentId')
  @Permissions('deposit.read')
  async deleteItemAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.depositService.deleteItemAttachment(user.tenantId, id, attachmentId);
  }

  @Patch('items/:id')
  @Permissions('deposit.update')
  async updateItem(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDepositItemDto,
  ) {
    return this.depositService.updateItem(user.tenantId, id, dto);
  }

  @Delete('items/:id')
  @Permissions('deposit.delete')
  async deleteItem(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.deleteItem(user.tenantId, id);
  }

  @Get('donors')
  @Permissions('deposit.read')
  async listDonors(
    @CurrentUser() user: JwtUser,
    @Query() query: ListDepositDonorsQueryDto,
  ) {
    return this.depositService.listDonors(user.tenantId, {
      page: query.page,
      limit: query.limit,
      all: query.all,
      search: query.search ?? query.q,
    });
  }

  @Post('donors')
  @Permissions('deposit.create')
  async createDonor(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateDepositDonorDto,
  ) {
    return this.depositService.createDonor(user.tenantId, dto);
  }

  @Post('donors/:id/comments')
  @Permissions('deposit.read')
  async createDonorComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositDonorCommentDto,
  ) {
    return this.depositService.addDonorComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('donors/:id/comments/:commentId')
  @Permissions('deposit.read')
  async deleteDonorComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.depositService.deleteDonorComment(user.tenantId, id, commentId);
  }

  @Post('donors/:id/attachments')
  @Permissions('deposit.read')
  async createDonorAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositDonorAttachmentDto,
  ) {
    return this.depositService.addDonorAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('donors/:id/attachments/:attachmentId')
  @Permissions('deposit.read')
  async deleteDonorAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.depositService.deleteDonorAttachment(user.tenantId, id, attachmentId);
  }

  @Get('donors/:id')
  @Permissions('deposit.read')
  async getDonor(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.getDonor(user.tenantId, id);
  }

  @Get('donors/:id/audit')
  @Permissions('deposit.read')
  async listDonorAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositService.listDonorAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('donors/:id')
  @Permissions('deposit.update')
  async updateDonor(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDepositDonorDto,
  ) {
    return this.depositService.updateDonor(user.tenantId, id, dto);
  }

  @Delete('donors/:id')
  @Permissions('deposit.delete')
  async deleteDonor(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.deleteDonor(user.tenantId, id);
  }

  @Get('entries')
  @Permissions('deposit.read')
  async listEntries(
    @CurrentUser() user: JwtUser,
    @Query() query: ListDepositEntriesQueryDto,
  ) {
    return this.depositService.listEntries(user.tenantId, {
      page: query.page,
      limit: query.limit,
      search: query.search ?? query.q,
      itemId: query.itemId,
      donorId: query.donorId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('entries/:id')
  @Permissions('deposit.read')
  async getEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.getEntry(user.tenantId, id);
  }

  @Get('entries/:id/audit')
  @Permissions('deposit.read')
  async listEntryAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositService.listEntryAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('entries')
  @Permissions('deposit.create')
  async createEntry(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateDepositEntryDto,
  ) {
    return this.depositService.createEntry(user.tenantId, dto);
  }

  @Post('entries/:id/comments')
  @Permissions('deposit.read')
  async createEntryComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositEntryCommentDto,
  ) {
    return this.depositService.addEntryComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('entries/:id/comments/:commentId')
  @Permissions('deposit.read')
  async deleteEntryComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.depositService.deleteEntryComment(user.tenantId, id, commentId);
  }

  @Post('entries/:id/attachments')
  @Permissions('deposit.read')
  async createEntryAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositEntryAttachmentDto,
  ) {
    return this.depositService.addEntryAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('entries/:id/attachments/:attachmentId')
  @Permissions('deposit.read')
  async deleteEntryAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.depositService.deleteEntryAttachment(user.tenantId, id, attachmentId);
  }

  @Patch('entries/:id')
  @Permissions('deposit.update')
  async updateEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDepositEntryDto,
  ) {
    return this.depositService.updateEntry(user.tenantId, id, dto);
  }

  @Delete('entries/:id')
  @Permissions('deposit.delete')
  async deleteEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.deleteEntry(user.tenantId, id);
  }

  @Get('exits')
  @Permissions('deposit.read')
  async listExits(
    @CurrentUser() user: JwtUser,
    @Query() query: ListDepositExitsQueryDto,
  ) {
    return this.depositService.listExits(user.tenantId, {
      page: query.page,
      limit: query.limit,
      search: query.search ?? query.q,
      itemId: query.itemId,
      type: query.type,
      from: query.from,
      to: query.to,
    });
  }

  @Get('exits/:id')
  @Permissions('deposit.read')
  async getExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.getExit(user.tenantId, id);
  }

  @Get('exits/:id/audit')
  @Permissions('deposit.read')
  async listExitAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositService.listExitAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('exits')
  @Permissions('deposit.create')
  async createExit(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateDepositExitDto,
  ) {
    return this.depositService.createExit(user.tenantId, dto);
  }

  @Post('exits/:id/comments')
  @Permissions('deposit.read')
  async createExitComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositExitCommentDto,
  ) {
    return this.depositService.addExitComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('exits/:id/comments/:commentId')
  @Permissions('deposit.read')
  async deleteExitComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.depositService.deleteExitComment(user.tenantId, id, commentId);
  }

  @Post('exits/:id/attachments')
  @Permissions('deposit.read')
  async createExitAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateDepositExitAttachmentDto,
  ) {
    return this.depositService.addExitAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('exits/:id/attachments/:attachmentId')
  @Permissions('deposit.read')
  async deleteExitAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.depositService.deleteExitAttachment(user.tenantId, id, attachmentId);
  }

  @Patch('exits/:id')
  @Permissions('deposit.update')
  async updateExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDepositExitDto,
  ) {
    return this.depositService.updateExit(user.tenantId, id, dto);
  }

  @Delete('exits/:id')
  @Permissions('deposit.delete')
  async deleteExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.depositService.deleteExit(user.tenantId, id);
  }
}
