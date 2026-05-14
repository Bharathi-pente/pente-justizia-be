// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CellsModule } from './modules/cells/cells.module';
import { ClioModule } from './modules/clio/clio.module';
import { SyncModule } from './modules/sync/sync.module';
import { AggregationModule } from './modules/aggregation/aggregation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Config must be first — all other modules depend on env vars
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CellsModule,
    ClioModule,
    SyncModule,
    AggregationModule,
    DashboardModule,
  ],
})
export class AppModule {}
