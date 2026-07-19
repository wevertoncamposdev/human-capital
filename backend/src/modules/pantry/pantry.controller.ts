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
import { CreatePantryDonorDto } from './dto/create-pantry-donor.dto';
import { CreatePantryDonorAttachmentDto } from './dto/create-pantry-donor-attachment.dto';
import { CreatePantryDonorCommentDto } from './dto/create-pantry-donor-comment.dto';
import { CreatePantryEntryDto } from './dto/create-pantry-entry.dto';
import { CreatePantryEntryAttachmentDto } from './dto/create-pantry-entry-attachment.dto';
import { CreatePantryEntryCommentDto } from './dto/create-pantry-entry-comment.dto';
import { CreatePantryExitDto } from './dto/create-pantry-exit.dto';
import { CreatePantryExitAttachmentDto } from './dto/create-pantry-exit-attachment.dto';
import { CreatePantryExitCommentDto } from './dto/create-pantry-exit-comment.dto';
import { CreatePantryItemDto } from './dto/create-pantry-item.dto';
import { CreatePantryItemAttachmentDto } from './dto/create-pantry-item-attachment.dto';
import { CreatePantryItemCommentDto } from './dto/create-pantry-item-comment.dto';
import { CreatePantrySectorDto } from './dto/create-pantry-sector.dto';
import { ListPantryDonorsQueryDto } from './dto/list-pantry-donors-query.dto';
import { ListPantryEntriesQueryDto } from './dto/list-pantry-entries-query.dto';
import { ListPantryExitsQueryDto } from './dto/list-pantry-exits-query.dto';
import { ListPantryItemsQueryDto } from './dto/list-pantry-items-query.dto';
import { UpdatePantryDonorDto } from './dto/update-pantry-donor.dto';
import { UpdatePantryEntryDto } from './dto/update-pantry-entry.dto';
import { UpdatePantryExitDto } from './dto/update-pantry-exit.dto';
import { UpdatePantryItemDto } from './dto/update-pantry-item.dto';
import { PantryService } from './pantry.service';
import { PantryConsumptionQueryDto } from './dto/pantry-consumption-query.dto';
import { ReversePantryMovementDto } from './dto/reverse-pantry-movement.dto';
import { ListPantryHistoryQueryDto } from './dto/list-pantry-history-query.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pantry')
export class PantryController {
  constructor(private readonly pantryService: PantryService) {}

  @Get('summary')
  @Permissions('pantry.read')
  async getSummary(@CurrentUser() user: JwtUser) {
    return this.pantryService.getSummary(user.tenantId);
  }

  @Get('dashboard')
  @Permissions('pantry.read')
  async getDashboard(@CurrentUser() user: JwtUser) {
    return this.pantryService.getDashboard(user.tenantId);
  }

  @Get('history')
  @Permissions('pantry.read')
  async listHistory(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPantryHistoryQueryDto,
  ) {
    return this.pantryService.listHistory(user.tenantId, {
      page: query.page,
      limit: query.limit,
      all: query.all,
      kind: query.kind,
      search: query.search ?? query.q,
      itemId: query.itemId,
      type: query.type,
      eventName: query.eventName,
      from: query.from,
      to: query.to,
    });
  }

  @Get('sectors')
  @Permissions('pantry.read')
  async listSectors(@CurrentUser() user: JwtUser) {
    return this.pantryService.listSectors(user.tenantId);
  }

  @Post('sectors')
  @Permissions('pantry.create')
  async createSector(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePantrySectorDto,
  ) {
    return this.pantryService.createSector(user.tenantId, dto);
  }

  @Get('consumption')
  @Permissions('pantry.read')
  async getConsumption(
    @CurrentUser() user: JwtUser,
    @Query() query: PantryConsumptionQueryDto,
  ) {
    return this.pantryService.getConsumption(user.tenantId, query);
  }

  @Get('flow')
  @Permissions('pantry.read')
  async getFlow(
    @CurrentUser() user: JwtUser,
    @Query() query: PantryConsumptionQueryDto,
  ) {
    return this.pantryService.getFlow(user.tenantId, query);
  }

  @Get('usage')
  @Permissions('pantry.read')
  async getUsage(
    @CurrentUser() user: JwtUser,
    @Query() query: PantryConsumptionQueryDto,
  ) {
    return this.pantryService.getUsage(user.tenantId, query);
  }

  @Post('entries/:id/reverse')
  @Permissions('pantry.update')
  async reverseEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReversePantryMovementDto,
  ) {
    return this.pantryService.reverseEntry(user.tenantId, id, dto);
  }

  @Post('exits/:id/reverse')
  @Permissions('pantry.update')
  async reverseExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReversePantryMovementDto,
  ) {
    return this.pantryService.reverseExit(user.tenantId, id, dto);
  }

  @Get('items')
  @Permissions('pantry.read')
  async listItems(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPantryItemsQueryDto,
  ) {
    return this.pantryService.listItems(user.tenantId, query);
  }

  @Get('items/suggestions')
  @Permissions('pantry.read')
  async listItemSuggestions(@CurrentUser() user: JwtUser) {
    return this.pantryService.listItemSuggestions(user.tenantId);
  }

  @Get('items/:id/sectors')
  @Permissions('pantry.read')
  async listItemSectors(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.listItemSectors(user.tenantId, id);
  }

  @Get('items/:id')
  @Permissions('pantry.read')
  async getItem(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.getItem(user.tenantId, id);
  }

  @Get('items/:id/audit')
  @Permissions('pantry.read')
  async listItemAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pantryService.listItemAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('items')
  @Permissions('pantry.create')
  async createItem(@CurrentUser() user: JwtUser, @Body() dto: CreatePantryItemDto) {
    return this.pantryService.createItem(user.tenantId, dto);
  }

  @Post('items/:id/comments')
  @Permissions('pantry.read')
  async createItemComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryItemCommentDto,
  ) {
    return this.pantryService.addItemComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('items/:id/comments/:commentId')
  @Permissions('pantry.read')
  async deleteItemComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.pantryService.deleteItemComment(user.tenantId, id, commentId);
  }

  @Post('items/:id/attachments')
  @Permissions('pantry.read')
  async createItemAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryItemAttachmentDto,
  ) {
    return this.pantryService.addItemAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('items/:id/attachments/:attachmentId')
  @Permissions('pantry.read')
  async deleteItemAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.pantryService.deleteItemAttachment(user.tenantId, id, attachmentId);
  }

  @Patch('items/:id')
  @Permissions('pantry.update')
  async updateItem(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePantryItemDto,
  ) {
    return this.pantryService.updateItem(user.tenantId, id, dto);
  }

  @Delete('items/:id')
  @Permissions('pantry.delete')
  async deleteItem(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.deleteItem(user.tenantId, id);
  }

  @Get('donors')
  @Permissions('pantry.read')
  async listDonors(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPantryDonorsQueryDto,
  ) {
    return this.pantryService.listDonors(user.tenantId, {
      page: query.page,
      limit: query.limit,
      all: query.all,
      search: query.search ?? query.q,
    });
  }

  @Post('donors')
  @Permissions('pantry.create')
  async createDonor(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePantryDonorDto,
  ) {
    return this.pantryService.createDonor(user.tenantId, dto);
  }

  @Post('donors/:id/comments')
  @Permissions('pantry.read')
  async createDonorComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryDonorCommentDto,
  ) {
    return this.pantryService.addDonorComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('donors/:id/comments/:commentId')
  @Permissions('pantry.read')
  async deleteDonorComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.pantryService.deleteDonorComment(user.tenantId, id, commentId);
  }

  @Post('donors/:id/attachments')
  @Permissions('pantry.read')
  async createDonorAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryDonorAttachmentDto,
  ) {
    return this.pantryService.addDonorAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('donors/:id/attachments/:attachmentId')
  @Permissions('pantry.read')
  async deleteDonorAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.pantryService.deleteDonorAttachment(user.tenantId, id, attachmentId);
  }

  @Get('donors/:id')
  @Permissions('pantry.read')
  async getDonor(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.getDonor(user.tenantId, id);
  }

  @Get('donors/:id/audit')
  @Permissions('pantry.read')
  async listDonorAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pantryService.listDonorAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('donors/:id')
  @Permissions('pantry.update')
  async updateDonor(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePantryDonorDto,
  ) {
    return this.pantryService.updateDonor(user.tenantId, id, dto);
  }

  @Delete('donors/:id')
  @Permissions('pantry.delete')
  async deleteDonor(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.deleteDonor(user.tenantId, id);
  }

  @Get('entries')
  @Permissions('pantry.read')
  async listEntries(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPantryEntriesQueryDto,
  ) {
    return this.pantryService.listEntries(user.tenantId, {
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
  @Permissions('pantry.read')
  async getEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.getEntry(user.tenantId, id);
  }

  @Get('entries/:id/audit')
  @Permissions('pantry.read')
  async listEntryAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pantryService.listEntryAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('entries')
  @Permissions('pantry.create')
  async createEntry(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePantryEntryDto,
  ) {
    return this.pantryService.createEntry(user.tenantId, dto);
  }

  @Post('entries/:id/comments')
  @Permissions('pantry.read')
  async createEntryComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryEntryCommentDto,
  ) {
    return this.pantryService.addEntryComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('entries/:id/comments/:commentId')
  @Permissions('pantry.read')
  async deleteEntryComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.pantryService.deleteEntryComment(user.tenantId, id, commentId);
  }

  @Post('entries/:id/attachments')
  @Permissions('pantry.read')
  async createEntryAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryEntryAttachmentDto,
  ) {
    return this.pantryService.addEntryAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('entries/:id/attachments/:attachmentId')
  @Permissions('pantry.read')
  async deleteEntryAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.pantryService.deleteEntryAttachment(user.tenantId, id, attachmentId);
  }

  @Patch('entries/:id')
  @Permissions('pantry.update')
  async updateEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePantryEntryDto,
  ) {
    return this.pantryService.updateEntry(user.tenantId, id, dto);
  }

  @Delete('entries/:id')
  @Permissions('pantry.delete')
  async deleteEntry(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.deleteEntry(user.tenantId, id);
  }

  @Get('exits')
  @Permissions('pantry.read')
  async listExits(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPantryExitsQueryDto,
  ) {
    return this.pantryService.listExits(user.tenantId, {
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
  @Permissions('pantry.read')
  async getExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.getExit(user.tenantId, id);
  }

  @Get('exits/:id/audit')
  @Permissions('pantry.read')
  async listExitAuditLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pantryService.listExitAuditLogs(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('exits')
  @Permissions('pantry.create')
  async createExit(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePantryExitDto,
  ) {
    return this.pantryService.createExit(user.tenantId, dto);
  }

  @Post('exits/:id/comments')
  @Permissions('pantry.read')
  async createExitComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryExitCommentDto,
  ) {
    return this.pantryService.addExitComment(user.tenantId, id, dto, user.userId);
  }

  @Delete('exits/:id/comments/:commentId')
  @Permissions('pantry.read')
  async deleteExitComment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.pantryService.deleteExitComment(user.tenantId, id, commentId);
  }

  @Post('exits/:id/attachments')
  @Permissions('pantry.read')
  async createExitAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreatePantryExitAttachmentDto,
  ) {
    return this.pantryService.addExitAttachment(user.tenantId, id, dto, user.userId);
  }

  @Delete('exits/:id/attachments/:attachmentId')
  @Permissions('pantry.read')
  async deleteExitAttachment(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.pantryService.deleteExitAttachment(user.tenantId, id, attachmentId);
  }

  @Patch('exits/:id')
  @Permissions('pantry.update')
  async updateExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePantryExitDto,
  ) {
    return this.pantryService.updateExit(user.tenantId, id, dto);
  }

  @Delete('exits/:id')
  @Permissions('pantry.delete')
  async deleteExit(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.pantryService.deleteExit(user.tenantId, id);
  }
}
