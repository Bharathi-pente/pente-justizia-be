// src/modules/billings/billings.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SyncLogService } from '../sync/sync-log.service';
import { ClioClientService } from '../clio/clio-client.service';
import { SyncEntity } from '../sync/sync.enums';
import type { ClioBill } from '../clio/clio.types';

export interface NormalizedBill {
  cellId: string;
  clioBillId: string;
  matterId: string | null;
  status: string;
  total: number;
  paid: number;
  due: number;
  issuedDate: Date | null;
  dueDate: Date | null;
  syncedAt: Date;
}

@Injectable()
export class BillingsService {
  private readonly logger = new Logger(BillingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clioClient: ClioClientService,
    private readonly syncLog: SyncLogService,
  ) {}

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async sync(cellId: string): Promise<number> {
    const logId = await this.syncLog.start(cellId, SyncEntity.BILLS);

    let rawBills: ClioBill[] = [];

    try {
      rawBills = await this.clioClient.fetchBills(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.syncLog.fail(logId, `Fetch failed: ${msg}`);
      throw error;
    }

    const { upserted, failed } = await this.upsertBills(cellId, rawBills);

    if (failed > 0) {
      await this.syncLog.partial(
        logId,
        rawBills.length,
        upserted,
        `${failed} records failed to upsert`,
      );
    } else {
      await this.syncLog.complete(logId, rawBills.length, upserted);
    }

    this.logger.log(
      `[BILLS] Sync complete — fetched: ${rawBills.length}, upserted: ${upserted}, failed: ${failed}`,
    );

    return upserted;
  }

  // ─── Upsert ───────────────────────────────────────────────────────────────

  private async upsertBills(
    cellId: string,
    bills: ClioBill[],
  ): Promise<{ upserted: number; failed: number }> {
    let upserted = 0;
    let failed = 0;
    const syncedAt = new Date();

    for (const raw of bills) {
      try {
        // Resolve internal matterId from Clio matter id
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

        const normalized = this.normalize(cellId, raw, matterId, syncedAt);

        await this.prisma.bill.upsert({
          where: {
            cellId_clioBillId: {
              cellId: normalized.cellId,
              clioBillId: normalized.clioBillId,
            },
          },
          update: {
            status: normalized.status,
            total: normalized.total,
            paid: normalized.paid,
            due: normalized.due,
            issuedDate: normalized.issuedDate,
            dueDate: normalized.dueDate,
            matterId: normalized.matterId,
            syncedAt: normalized.syncedAt,
          },
          create: normalized,
        });

        upserted++;
      } catch (error: unknown) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[BILLS] Failed to upsert bill ${raw.id}: ${msg}`);
      }
    }

    return { upserted, failed };
  }

  // ─── Normalize ────────────────────────────────────────────────────────────

  private normalize(
    cellId: string,
    raw: ClioBill,
    matterId: string | null,
    syncedAt: Date,
  ): NormalizedBill {
    return {
      cellId,
      clioBillId: String(raw.id),
      matterId,
      status: raw.status ?? 'draft',
      total: raw.total ?? 0,
      paid: raw.paid ?? 0,
      due: raw.due ?? 0,
      issuedDate: raw.issued_at ? new Date(raw.issued_at) : null,
      dueDate: raw.due_at ? new Date(raw.due_at) : null,
      syncedAt,
    };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async findByCellId(cellId: string): Promise<NormalizedBill[]> {
    const bills = await this.prisma.bill.findMany({
      where: { cellId },
      orderBy: { syncedAt: 'desc' },
    });

    return bills.map((b) => ({
      cellId: b.cellId,
      clioBillId: b.clioBillId,
      matterId: b.matterId ?? null,
      status: b.status,
      total: Number(b.total),
      paid: Number(b.paid),
      due: Number(b.due),
      issuedDate: b.issuedDate ?? null,
      dueDate: b.dueDate ?? null,
      syncedAt: b.syncedAt,
    }));
  }

  /** Total gross recovery (paid bills) for a cell. */
  async getGrossRecovery(cellId: string): Promise<number> {
    const result = await this.prisma.bill.aggregate({
      where: { cellId, status: 'paid' },
      _sum: { paid: true },
    });
    return Number(result._sum.paid ?? 0);
  }

  /** Outstanding balance for a cell. */
  async getOutstandingDue(cellId: string): Promise<number> {
    const result = await this.prisma.bill.aggregate({
      where: { cellId },
      _sum: { due: true },
    });
    return Number(result._sum.due ?? 0);
  }
}
