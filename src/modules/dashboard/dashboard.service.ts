// src/modules/dashboard/dashboard.service.ts

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AggregationService } from '../aggregation/aggregation.service';
import { SyncService } from '../sync/sync.service';
import type { CellDashboardResponseDto } from './dto/cell-dashboard.dto';
import type { HqOverviewResponseDto } from './dto/hq-overview.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregation: AggregationService,
    private readonly syncService: SyncService,
  ) {}

  // ─── Cell Dashboard ────────────────────────────────────────────────────────

  /**
   * GET /cells/:cellId/dashboard
   *
   * Returns aggregated metrics for a single cell.
   * All data comes from normalized DB tables — no live Clio calls.
   */
  async getCellDashboard(cellId: string): Promise<CellDashboardResponseDto> {
    await this.assertCellExists(cellId);
    const metrics = await this.aggregation.getCellDashboard(cellId);
    return metrics as CellDashboardResponseDto;
  }

  // ─── HQ Overview ──────────────────────────────────────────────────────────

  /**
   * GET /hq/overview
   *
   * Returns platform-wide aggregated metrics across all connected cells.
   * Pure DB — never touches Clio.
   */
  async getHqOverview(): Promise<HqOverviewResponseDto> {
    const metrics = await this.aggregation.getHqOverview();
    return metrics as HqOverviewResponseDto;
  }

  // ─── Manual Sync Trigger ──────────────────────────────────────────────────

  /**
   * POST /cells/:cellId/sync
   *
   * Kicks off a full background sync for a cell.
   * Returns immediately — sync runs asynchronously.
   */
  async triggerSync(
    cellId: string,
  ): Promise<{ queued: boolean; cellId: string }> {
    await this.assertCellExists(cellId);

    this.logger.log(`[DASHBOARD] Manual sync triggered for cell: ${cellId}`);

    // Fire-and-forget — do not await
    this.syncService.runFullSync(cellId).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[DASHBOARD] Background sync failed for ${cellId}: ${msg}`,
      );
    });

    return { queued: true, cellId };
  }

  /**
   * POST /cells/:cellId/sync/:entity
   *
   * Triggers a targeted sync for a single entity type.
   */
  async triggerEntitySync(
    cellId: string,
    entity:
      | 'matters'
      | 'contacts'
      | 'bills'
      | 'tasks'
      | 'documents'
      | 'activities',
  ): Promise<{ entity: string; upserted: number; error: string | null }> {
    await this.assertCellExists(cellId);
    return this.syncService.syncEntity(cellId, entity);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async assertCellExists(cellId: string): Promise<void> {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
      select: { id: true },
    });

    if (!cell) {
      throw new NotFoundException(`Cell ${cellId} not found`);
    }
  }

  async getTaskbycellId(cellId: string) {
    const task = await this.prisma.task.findMany({
      where: { cellId },
    });
    return task;
  }
}
