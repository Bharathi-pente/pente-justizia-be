// src/modules/aggregation/aggregation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SyncLogService } from '../sync/sync-log.service';
import { CellStatus } from '../cells/enums/cell-status.enum';

// ─── Cell Dashboard ───────────────────────────────────────────────────────────

export interface CellDashboardMetrics {
  cellId: string;
  cellName: string;
  status: CellStatus;
  sync: {
    lastSyncedAt: Date | null;
    entityStatuses: {
      entity: string;
      status: string;
      lastRun: Date | null;
      recordsUpserted: number;
    }[];
  };
  matters: {
    total: number;
    open: number;
    closed: number;
    pending: number;
    byStage: { stage: string; count: number }[];
    avgCycleDays: number | null;
  };
  financials: {
    grossRecovery: number;
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    collectionRate: number | null;
  };
  contacts: {
    total: number;
  };
  tasks: {
    total: number;
    incomplete: number;
    overdue: number;
  };
  documents: {
    total: number;
  };
  activities: {
    total: number;
  };
  pipeline: {
    stage: string;
    count: number;
  }[];
}

// ─── HQ Overview ─────────────────────────────────────────────────────────────

export interface HqOverviewMetrics {
  summary: {
    activeCells: number;
    totalCells: number;
    totalMatters: number;
    totalOpenMatters: number;
    grossRecovery: number;
    totalDue: number;
    lastSyncedAt: Date | null;
  };
  pipeline: {
    stage: string;
    count: number;
  }[];
  cells: CellPerformanceRow[];
}

export interface CellPerformanceRow {
  cellId: string;
  cellName: string;
  status: CellStatus;
  matters: number;
  openMatters: number;
  grossRecovery: number;
  totalDue: number;
  overdueTaskCount: number;
  documentCount: number;
  avgCycleDays: number | null;
  lastSyncedAt: Date | null;
}

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncLog: SyncLogService,
  ) {}

  // ─── Cell Dashboard ────────────────────────────────────────────────────────

  async getCellDashboard(cellId: string): Promise<CellDashboardMetrics> {
    this.logger.log(`[AGG] Building cell dashboard for: ${cellId}`);

    const [
      cell,
      matterStats,
      stageBreakdown,
      cycleTime,
      financials,
      contactCount,
      taskStats,
      documentCount,
      activityCount,
      syncStatuses,
      lastCompletedSync, // ← replaced tokenRecord
    ] = await Promise.all([
      this.getCell(cellId),
      this.getMatterStats(cellId),
      this.getMatterStageBreakdown(cellId),
      this.getAvgCycleTime(cellId),
      this.getFinancials(cellId),
      this.prisma.contact.count({ where: { cellId } }),
      this.getTaskStats(cellId),
      this.prisma.document.count({ where: { cellId } }),
      this.prisma.activity.count({ where: { cellId } }),
      this.syncLog.getLatestForCell(cellId),
      this.prisma.syncLog.findFirst({
        // ← replaced cellToken query
        where: { cellId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
    ]);

    return {
      cellId,
      cellName: cell.name,
      status: cell.status as CellStatus,
      sync: {
        lastSyncedAt: lastCompletedSync?.completedAt ?? null, // ← fixed
        entityStatuses: syncStatuses.map((s) => ({
          entity: s.entity,
          status: s.status,
          lastRun: s.completedAt,
          recordsUpserted: s.recordsUpserted,
        })),
      },
      matters: {
        total: matterStats.total,
        open: matterStats.open,
        closed: matterStats.closed,
        pending: matterStats.pending,
        byStage: stageBreakdown,
        avgCycleDays: cycleTime,
      },
      financials,
      contacts: { total: contactCount },
      tasks: taskStats,
      documents: { total: documentCount },
      activities: { total: activityCount },
      pipeline: stageBreakdown,
    };
  }
  // ─── HQ Overview ──────────────────────────────────────────────────────────

  async getHqOverview(): Promise<HqOverviewMetrics> {
    this.logger.log('[AGG] Building HQ overview');

    const connectedCells = await this.prisma.cell.findMany({
      where: {
        status: {
          in: [
            CellStatus.CONNECTED,
            CellStatus.SYNCING,
            CellStatus.SYNC_FAILED,
          ],
        },
      },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalCells = await this.prisma.cell.count();

    // Build per-cell performance rows in parallel
    const cellRows = await Promise.all(
      connectedCells.map((cell) => this.getCellPerformanceRow(cell)),
    );

    // Platform-wide aggregates — single DB queries, not Node.js reduction
    const [matterAggregate, financialAggregate, pipelineBreakdown] =
      await Promise.all([
        this.prisma.matter.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.bill.aggregate({
          _sum: { paid: true, due: true },
        }),
        this.prisma.matter.groupBy({
          by: ['stage'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
      ]);

    const totalMatters = matterAggregate.reduce(
      (sum, r) => sum + r._count.id,
      0,
    );
    const totalOpenMatters =
      matterAggregate.find((r) => r.status === 'Open')?._count.id ?? 0;
    const grossRecovery = Number(financialAggregate._sum.paid ?? 0);
    const totalDue = Number(financialAggregate._sum.due ?? 0);

    // Most recent token update across all connected cells
    const latestToken = await this.prisma.cellToken.findFirst({
      where: { cellId: { in: connectedCells.map((c) => c.id) } },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const pipeline = pipelineBreakdown
      .filter((r) => r.stage !== null)
      .map((r) => ({
        stage: r.stage as string,
        count: r._count.id,
      }));

    return {
      summary: {
        activeCells: connectedCells.length,
        totalCells,
        totalMatters,
        totalOpenMatters,
        grossRecovery,
        totalDue,
        lastSyncedAt: latestToken?.updatedAt ?? null,
      },
      pipeline,
      cells: cellRows,
    };
  }

  // ─── Per-cell performance row (used by HQ) ────────────────────────────────

  private async getCellPerformanceRow(cell: {
    id: string;
    name: string;
    status: string;
  }): Promise<CellPerformanceRow> {
    const [
      matterStats,
      financials,
      overdueTaskCount,
      documentCount,
      cycleTime,
      tokenRecord,
    ] = await Promise.all([
      this.getMatterStats(cell.id),
      this.getFinancials(cell.id),
      this.prisma.task.count({
        where: {
          cellId: cell.id,
          status: 'incomplete',
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.document.count({ where: { cellId: cell.id } }),
      this.getAvgCycleTime(cell.id),
      this.prisma.cellToken.findUnique({
        where: { cellId: cell.id },
        select: { updatedAt: true },
      }),
    ]);

    return {
      cellId: cell.id,
      cellName: cell.name,
      status: cell.status as CellStatus,
      matters: matterStats.total,
      openMatters: matterStats.open,
      grossRecovery: financials.grossRecovery,
      totalDue: financials.totalDue,
      overdueTaskCount,
      documentCount,
      avgCycleDays: cycleTime,
      lastSyncedAt: tokenRecord?.updatedAt ?? null,
    };
  }

  // ─── Shared sub-queries ───────────────────────────────────────────────────

  private async getCell(cellId: string) {
    const cell = await this.prisma.cell.findUniqueOrThrow({
      where: { id: cellId },
      select: { name: true, status: true },
    });
    return cell;
  }

  private async getMatterStats(cellId: string): Promise<{
    total: number;
    open: number;
    closed: number;
    pending: number;
  }> {
    const grouped = await this.prisma.matter.groupBy({
      by: ['status'],
      where: { cellId },
      _count: { id: true },
    });

    const total = grouped.reduce((sum, r) => sum + r._count.id, 0);
    const open = grouped.find((r) => r.status === 'Open')?._count.id ?? 0;
    const closed = grouped.find((r) => r.status === 'Closed')?._count.id ?? 0;
    const pending = grouped.find((r) => r.status === 'Pending')?._count.id ?? 0;

    return { total, open, closed, pending };
  }

  private async getMatterStageBreakdown(
    cellId: string,
  ): Promise<{ stage: string; count: number }[]> {
    const grouped = await this.prisma.matter.groupBy({
      by: ['stage'],
      where: { cellId, stage: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return grouped.map((r) => ({
      stage: r.stage as string,
      count: r._count.id,
    }));
  }

  /**
   * Average case lifecycle duration in days.
   * Only counts matters that have both openDate and closeDate.
   * Computed at DB level via raw query to avoid pulling all rows into Node.
   */
  private async getAvgCycleTime(cellId: string): Promise<number | null> {
    const result = await this.prisma.$queryRaw<{ avg_days: number | null }[]>`
      SELECT AVG(
        EXTRACT(EPOCH FROM ("closeDate" - "openDate")) / 86400
      )::float AS avg_days
      FROM "Matter"
      WHERE "cellId" = ${cellId}
        AND "openDate" IS NOT NULL
        AND "closeDate" IS NOT NULL
    `;

    const avg = result[0]?.avg_days;
    return avg !== null && avg !== undefined ? Math.round(avg) : null;
  }

  private async getFinancials(cellId: string): Promise<{
    grossRecovery: number;
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    collectionRate: number | null;
  }> {
    const agg = await this.prisma.bill.aggregate({
      where: { cellId },
      _sum: { total: true, paid: true, due: true },
    });

    const totalBilled = Number(agg._sum.total ?? 0);
    const totalPaid = Number(agg._sum.paid ?? 0);
    const totalDue = Number(agg._sum.due ?? 0);

    // Gross recovery = sum of paid amounts across all bills
    const paidAgg = await this.prisma.bill.aggregate({
      where: { cellId, status: 'paid' },
      _sum: { paid: true },
    });
    const grossRecovery = Number(paidAgg._sum.paid ?? 0);

    const collectionRate =
      totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : null;

    return { grossRecovery, totalBilled, totalPaid, totalDue, collectionRate };
  }

  private async getTaskStats(cellId: string): Promise<{
    total: number;
    incomplete: number;
    overdue: number;
  }> {
    const [total, incomplete, overdue] = await Promise.all([
      this.prisma.task.count({ where: { cellId } }),
      this.prisma.task.count({ where: { cellId, status: 'incomplete' } }),
      this.prisma.task.count({
        where: {
          cellId,
          status: 'incomplete',
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return { total, incomplete, overdue };
  }

  
}
