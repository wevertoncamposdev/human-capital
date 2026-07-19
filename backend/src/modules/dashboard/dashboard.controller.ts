import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { DashboardService } from './dashboard.service';
import { GetDashboardOverviewQueryDto } from './dto/get-dashboard-overview-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async getOverview(
    @CurrentUser() user: JwtUser,
    @Query() query: GetDashboardOverviewQueryDto,
  ) {
    return this.dashboard.getOverview(user.tenantId, {
      from: query.from,
      to: query.to,
    });
  }
}

