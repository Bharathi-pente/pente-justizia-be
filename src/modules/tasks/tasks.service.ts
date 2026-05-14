// src/modules/tasks/tasks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SyncLogService } from '../sync/sync-log.service';
import { ClioClientService } from '../clio/clio-client.service';
import { SyncEntity } from '../sync/sync.enums';
import type { ClioTask } from '../clio/clio.types';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clioClient: ClioClientService,
    private readonly syncLog: SyncLogService,
  ) {}

  async sync(cellId: string): Promise<number> {
    const logId = await this.syncLog.start(cellId, SyncEntity.TASKS);
    let rawTasks: ClioTask[] = [];

    try {
      rawTasks = await this.clioClient.fetchTasks(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.syncLog.fail(logId, `Fetch failed: ${msg}`);
      throw error;
    }

    let upserted = 0;
    let failed = 0;
    const syncedAt = new Date();

    for (const raw of rawTasks) {
      try {
        let matterId: string | null = null;
        if (raw.matter?.id) {
          const matter = await this.prisma.matter.findUnique({
            where: {
              cellId_clioMatterId: {
                cellId,
                clioMatterId: String(raw.matter.id),
              },
            },
            select: { id: true },
          });
          matterId = matter?.id ?? null;
        }

        await this.prisma.task.upsert({
          where: {
            cellId_clioTaskId: { cellId, clioTaskId: String(raw.id) },
          },
          update: {
            name: raw.name,
            status: raw.status,
            priority: raw.priority ?? null,
            dueDate: raw.due_at ? new Date(raw.due_at) : null,
            assigneeName: raw.assignee?.name ?? null,
            matterId,
            syncedAt,
          },
          create: {
            cellId,
            clioTaskId: String(raw.id),
            name: raw.name,
            status: raw.status,
            priority: raw.priority ?? null,
            dueDate: raw.due_at ? new Date(raw.due_at) : null,
            assigneeName: raw.assignee?.name ?? null,
            matterId,
            syncedAt,
          },
        });

        upserted++;
      } catch (error: unknown) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[TASKS] Failed to upsert task ${raw.id}: ${msg}`);
      }
    }

    if (failed > 0) {
      await this.syncLog.partial(
        logId,
        rawTasks.length,
        upserted,
        `${failed} failed`,
      );
    } else {
      await this.syncLog.complete(logId, rawTasks.length, upserted);
    }

    return upserted;
  }

  async findByCellId(cellId: string) {
    return this.prisma.task.findMany({
      where: { cellId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueCount(cellId: string): Promise<number> {
    return this.prisma.task.count({
      where: {
        cellId,
        status: 'incomplete',
        dueDate: { lt: new Date() },
      },
    });
  }
}
