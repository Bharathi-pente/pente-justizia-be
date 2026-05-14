// src/modules/documents/documents.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SyncLogService } from '../sync/sync-log.service';
import { ClioClientService } from '../clio/clio-client.service';
import { SyncEntity } from '../sync/sync.enums';
import type { ClioDocument } from '../clio/clio.types';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clioClient: ClioClientService,
    private readonly syncLog: SyncLogService,
  ) {}

  async sync(cellId: string): Promise<number> {
    const logId = await this.syncLog.start(cellId, SyncEntity.DOCUMENTS);
    let rawDocs: ClioDocument[] = [];

    try {
      rawDocs = await this.clioClient.fetchDocuments(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.syncLog.fail(logId, `Fetch failed: ${msg}`);
      throw error;
    }

    let upserted = 0;
    let failed = 0;
    const syncedAt = new Date();

    for (const raw of rawDocs) {
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

        await this.prisma.document.upsert({
          where: {
            cellId_clioDocumentId: {
              cellId,
              clioDocumentId: String(raw.id),
            },
          },
          update: {
            name: raw.name,
            category: raw.document_category?.name ?? null,
            versionCount: raw.versions_count ?? 1,
            matterId,
            syncedAt,
          },
          create: {
            cellId,
            clioDocumentId: String(raw.id),
            name: raw.name,
            category: raw.document_category?.name ?? null,
            versionCount: raw.versions_count ?? 1,
            matterId,
            syncedAt,
          },
        });

        upserted++;
      } catch (error: unknown) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[DOCS] Failed to upsert document ${raw.id}: ${msg}`);
      }
    }

    if (failed > 0) {
      await this.syncLog.partial(
        logId,
        rawDocs.length,
        upserted,
        `${failed} failed`,
      );
    } else {
      await this.syncLog.complete(logId, rawDocs.length, upserted);
    }

    return upserted;
  }

  async getDocumentCount(cellId: string): Promise<number> {
    return this.prisma.document.count({ where: { cellId } });
  }
}
