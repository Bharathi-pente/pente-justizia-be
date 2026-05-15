// src/modules/aggregation/aggregation.module.ts

import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { SyncModule } from '../sync/sync.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, SyncModule],
  providers: [AggregationService],
  exports: [AggregationService],
})
export class AggregationModule {}
