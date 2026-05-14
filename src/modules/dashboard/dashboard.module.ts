// src/modules/dashboard/dashboard.module.ts

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { SyncModule } from '../sync/sync.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AggregationModule, SyncModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
