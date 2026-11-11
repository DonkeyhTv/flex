import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { StatsService } from './stats.service.js';

@ApiTags('stats')
@UseGuards(AdminGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  overview() {
    return this.stats.overview();
  }
}
