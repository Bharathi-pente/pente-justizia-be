// src/modules/activities/activities.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SyncLogService } from '../sync/sync-log.service';
import { ClioClientService } from '../clio/clio-client.service';
import { SyncEntity } from '../sync/sync.enums';
import type { ClioActivity } from '../clio/clio.types';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clioClient: ClioClientService,
    private readonly syncLog: SyncLogService,
  ) {}

  async sync(cellId: string): Promise<number> {
    const logId = await this.syncLog.start(cellId, SyncEntity.ACTIVITIES);
    let rawActivities: ClioActivity[] = [];

    try {
      rawActivities = await this.clioClient.fetchActivities(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.syncLog.fail(logId, `Fetch failed: ${msg}`);
      throw error;
    }

    let upserted = 0;
    let failed = 0;
    const syncedAt = new Date();

    for (const raw of rawActivities) {
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

        await this.prisma.activity.upsert({
          where: {
            cellId_clioActivityId: {
              cellId,
              clioActivityId: String(raw.id),
            },
          },
          update: {
            type: raw.type,
            summary: raw.summary ?? null,
            quantity: raw.quantity ?? 0,
            activityDate: raw.date ? new Date(raw.date) : null,
            matterId,
            syncedAt,
          },
          create: {
            cellId,
            clioActivityId: String(raw.id),
            type: raw.type,
            summary: raw.summary ?? null,
            quantity: raw.quantity ?? 0,
            activityDate: raw.date ? new Date(raw.date) : null,
            matterId,
            syncedAt,
          },
        });

        upserted++;
      } catch (error: unknown) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[ACTIVITIES] Failed to upsert activity ${raw.id}: ${msg}`,
        );
      }
    }

    if (failed > 0) {
      await this.syncLog.partial(
        logId,
        rawActivities.length,
        upserted,
        `${failed} failed`,
      );
    } else {
      await this.syncLog.complete(logId, rawActivities.length, upserted);
    }

    return upserted;
  }
}
