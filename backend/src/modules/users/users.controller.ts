import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: JwtUser) {
    return this.usersService.getProfile(user.tenantId, user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.usersService.updateMyProfile(user.tenantId, user.userId, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async changeMyPassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangeMyPasswordDto,
  ) {
    return this.usersService.changeMyPassword(user.tenantId, user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.read')
  async listUsers(
    @CurrentUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.listUsers(user.tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('mentionable')
  @UseGuards(JwtAuthGuard)
  async listMentionableUsers(
    @CurrentUser() user: JwtUser,
    @Query('permission') permission?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.listMentionableUsers(
      user.tenantId,
      user.userId,
      permission ?? '',
      search,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.read')
  async getUser(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.usersService.getUserDetail(user.tenantId, id);
  }

  @Get(':id/access-logs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.read')
  async getUserAccessLogs(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.getAccessLogsForUser(user.tenantId, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action: action ? (action as 'LOGIN' | 'REFRESH' | 'LOGOUT') : undefined,
      search,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.create')
  async createUser(@CurrentUser() user: JwtUser, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(user.tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.update')
  async updateUser(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user.tenantId, id, dto);
  }

  @Post(':id/mfa/reset')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.update')
  async resetUserMfa(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.usersService.resetUserMfa(user.tenantId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.delete')
  async deleteUser(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.usersService.deleteUser(user.tenantId, id);
  }
}
