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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { type JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { CreateTaskChecklistItemDto } from './dto/create-task-checklist-item.dto';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskSubtaskDto } from './dto/create-task-subtask.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskChecklistItemDto } from './dto/update-task-checklist-item.dto';
import { UpdateTaskSubtaskDto } from './dto/update-task-subtask.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Permissions('tasks.read')
  async listTasks(
    @CurrentUser() user: JwtUser | undefined,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.listTasks(this.getTenantId(user), query);
  }

  @Get('assignable-users')
  @Permissions('tasks.read')
  async listAssignableUsers(
    @CurrentUser() user: JwtUser | undefined,
    @Query('q') q?: string,
  ) {
    return this.tasksService.listAssignableUsers(this.getTenantId(user), q);
  }

  @Post()
  @Permissions('tasks.create')
  async createTask(
    @CurrentUser() user: JwtUser | undefined,
    @Body() dto: CreateTaskDto,
  ) {
    const authUser = this.assertUser(user);
    return this.tasksService.createTask(authUser.tenantId, authUser.userId, dto);
  }

  @Get(':id')
  @Permissions('tasks.read')
  async getTask(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.tasksService.getTask(this.getTenantId(user), id);
  }

  @Get(':id/audit')
  @Permissions('tasks.read')
  async listAuditLogs(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.listAuditLogs(this.getTenantId(user), id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id')
  @Permissions('tasks.update')
  async updateTask(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(this.getTenantId(user), id, dto);
  }

  @Delete(':id')
  @Permissions('tasks.delete')
  async deleteTask(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.tasksService.deleteTask(this.getTenantId(user), id);
  }

  @Post(':id/checklist')
  @Permissions('tasks.update')
  async addChecklistItem(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateTaskChecklistItemDto,
  ) {
    return this.tasksService.addChecklistItem(this.getTenantId(user), id, dto);
  }

  @Patch(':id/checklist/:itemId/toggle')
  @Permissions('tasks.update')
  async toggleChecklistItem(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
  ) {
    return this.tasksService.toggleChecklistItem(
      this.getTenantId(user),
      id,
      itemId,
    );
  }

  @Patch(':id/checklist/:itemId')
  @Permissions('tasks.update')
  async updateChecklistItem(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Body() dto: UpdateTaskChecklistItemDto,
  ) {
    return this.tasksService.updateChecklistItem(this.getTenantId(user), id, itemId, dto);
  }

  @Delete(':id/checklist/:itemId')
  @Permissions('tasks.update')
  async deleteChecklistItem(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
  ) {
    return this.tasksService.deleteChecklistItem(this.getTenantId(user), id, itemId);
  }

  @Post(':id/subtasks')
  @Permissions('tasks.update')
  async addSubtask(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateTaskSubtaskDto,
  ) {
    return this.tasksService.addSubtask(this.getTenantId(user), id, dto);
  }

  @Patch(':id/subtasks/:subtaskId/toggle-status')
  @Permissions('tasks.update')
  async toggleSubtaskStatus(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('subtaskId', new ParseUUIDPipe({ version: '4' })) subtaskId: string,
  ) {
    return this.tasksService.toggleSubtaskStatus(
      this.getTenantId(user),
      id,
      subtaskId,
    );
  }

  @Patch(':id/subtasks/:subtaskId')
  @Permissions('tasks.update')
  async updateSubtask(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('subtaskId', new ParseUUIDPipe({ version: '4' })) subtaskId: string,
    @Body() dto: UpdateTaskSubtaskDto,
  ) {
    return this.tasksService.updateSubtask(this.getTenantId(user), id, subtaskId, dto);
  }

  @Delete(':id/subtasks/:subtaskId')
  @Permissions('tasks.update')
  async deleteSubtask(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('subtaskId', new ParseUUIDPipe({ version: '4' })) subtaskId: string,
  ) {
    return this.tasksService.deleteSubtask(this.getTenantId(user), id, subtaskId);
  }

  @Post(':id/comments')
  @Permissions('tasks.update')
  async addComment(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateTaskCommentDto,
  ) {
    const authUser = this.assertUser(user);
    return this.tasksService.addComment(authUser.tenantId, authUser.userId, id, dto);
  }

  @Delete(':id/comments/:commentId')
  @Permissions('tasks.update')
  async deleteComment(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
  ) {
    return this.tasksService.deleteComment(this.getTenantId(user), id, commentId);
  }

  @Post(':id/attachments')
  @Permissions('tasks.update')
  async addAttachment(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateTaskAttachmentDto,
  ) {
    const authUser = this.assertUser(user);
    return this.tasksService.addAttachment(authUser.tenantId, authUser.userId, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @Permissions('tasks.update')
  async deleteAttachment(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
  ) {
    return this.tasksService.deleteAttachment(this.getTenantId(user), id, attachmentId);
  }

  @Post(':id/dependencies')
  @Permissions('tasks.update')
  async addDependency(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateTaskDependencyDto,
  ) {
    return this.tasksService.addDependency(this.getTenantId(user), id, dto);
  }

  @Delete(':id/dependencies/:dependencyId')
  @Permissions('tasks.update')
  async deleteDependency(
    @CurrentUser() user: JwtUser | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('dependencyId', new ParseUUIDPipe({ version: '4' })) dependencyId: string,
  ) {
    return this.tasksService.deleteDependency(this.getTenantId(user), id, dependencyId);
  }

  private getTenantId(user?: JwtUser) {
    if (!user?.tenantId) {
      throw new UnauthorizedException('Token invalid');
    }
    return user.tenantId;
  }

  private assertUser(user?: JwtUser) {
    if (!user?.tenantId || !user.userId) {
      throw new UnauthorizedException('Token invalid');
    }
    return user;
  }
}
