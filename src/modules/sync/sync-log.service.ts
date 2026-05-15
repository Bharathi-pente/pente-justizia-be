// src/modules/sync/sync-log.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SyncEntity, SyncStatus } from './sync.enums';
import { PrismaService } from 'src/prisma/prisma.service'

export interface SyncLogRecord {
  id: string;
  cellId: string;
  entity: SyncEntity;
  status: SyncStatus;
  recordsFetched: number;
  recordsUpserted: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class SyncLogService {
  private readonly logger = new Logger(SyncLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a RUNNING log entry when a sync starts. Returns the log id. */
  async start(cellId: string, entity: SyncEntity): Promise<string> {
    const log = await this.prisma.syncLog.create({
      data: {
        cellId,
        entity,
        status: SyncStatus.RUNNING,
      },
    });
    this.logger.log(
      `[SYNC-LOG] Started — ${entity} for cell ${cellId} (${log.id})`,
    );
    return log.id;
  }

  /** Mark a log entry as COMPLETED with final counts. */
  async complete(
    logId: string,
    recordsFetched: number,
    recordsUpserted: number,
  ): Promise<void> {
    await this.prisma.syncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.COMPLETED,
        recordsFetched,
        recordsUpserted,
        completedAt: new Date(),
      },
    });
    this.logger.log(
      `[SYNC-LOG] Completed (${logId}) — fetched: ${recordsFetched}, upserted: ${recordsUpserted}`,
    );
  }

  /** Mark a log entry as FAILED with an error message. */
  async fail(logId: string, errorMessage: string): Promise<void> {
    await this.prisma.syncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage: errorMessage.substring(0, 1000), // guard against huge stack traces
      },
    });
    this.logger.error(`[SYNC-LOG] Failed (${logId}): ${errorMessage}`);
  }

  /** Mark a log as PARTIAL — some records succeeded, some failed. */
  async partial(
    logId: string,
    recordsFetched: number,
    recordsUpserted: number,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.syncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.PARTIAL,
        recordsFetched,
        recordsUpserted,
        completedAt: new Date(),
        errorMessage: errorMessage.substring(0, 1000),
      },
    });
    this.logger.warn(
      `[SYNC-LOG] Partial (${logId}) — fetched: ${recordsFetched}, upserted: ${recordsUpserted}`,
    );
  }

  /** Get the most recent sync log per entity for a cell. */
  async getLatestForCell(cellId: string): Promise<SyncLogRecord[]> {
    const logs = await this.prisma.syncLog.findMany({
      where: { cellId },
      orderBy: { startedAt: 'desc' },
      distinct: ['entity'],
    });

    return logs.map((l) => ({
      id: l.id,
      cellId: l.cellId,
      entity: l.entity as SyncEntity,
      status: l.status as SyncStatus,
      recordsFetched: l.recordsFetched,
      recordsUpserted: l.recordsUpserted,
      errorMessage: l.errorMessage,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
    }));
  }

  /** Full history for a cell + entity (for admin/debug). */
  async getHistory(
    cellId: string,
    entity: SyncEntity,
    limit = 20,
  ): Promise<SyncLogRecord[]> {
    const logs = await this.prisma.syncLog.findMany({
      where: { cellId, entity },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      cellId: l.cellId,
      entity: l.entity as SyncEntity,
      status: l.status as SyncStatus,
      recordsFetched: l.recordsFetched,
      recordsUpserted: l.recordsUpserted,
      errorMessage: l.errorMessage,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
    }));
  }
}
