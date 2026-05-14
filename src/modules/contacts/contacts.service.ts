// src/modules/contacts/contacts.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SyncLogService } from '../sync/sync-log.service';
import { ClioClientService } from '../clio/clio-client.service';
import { SyncEntity } from '../sync/sync.enums';
import type { ClioContact } from '../clio/clio.types';

export interface NormalizedContact {
  cellId: string;
  clioContactId: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  syncedAt: Date;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clioClient: ClioClientService,
    private readonly syncLog: SyncLogService,
  ) {}

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async sync(cellId: string): Promise<number> {
    const logId = await this.syncLog.start(cellId, SyncEntity.CONTACTS);

    let rawContacts: ClioContact[] = [];

    try {
      rawContacts = await this.clioClient.fetchContacts(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.syncLog.fail(logId, `Fetch failed: ${msg}`);
      throw error;
    }

    const { upserted, failed } = await this.upsertContacts(cellId, rawContacts);

    if (failed > 0) {
      await this.syncLog.partial(
        logId,
        rawContacts.length,
        upserted,
        `${failed} records failed to upsert`,
      );
    } else {
      await this.syncLog.complete(logId, rawContacts.length, upserted);
    }

    this.logger.log(
      `[CONTACTS] Sync complete — fetched: ${rawContacts.length}, upserted: ${upserted}, failed: ${failed}`,
    );

    return upserted;
  }

  // ─── Upsert ───────────────────────────────────────────────────────────────

  private async upsertContacts(
    cellId: string,
    contacts: ClioContact[],
  ): Promise<{ upserted: number; failed: number }> {
    let upserted = 0;
    let failed = 0;
    const syncedAt = new Date();

    for (const raw of contacts) {
      try {
        const normalized = this.normalize(cellId, raw, syncedAt);

        await this.prisma.contact.upsert({
          where: {
            cellId_clioContactId: {
              cellId: normalized.cellId,
              clioContactId: normalized.clioContactId,
            },
          },
          update: {
            name: normalized.name,
            type: normalized.type,
            email: normalized.email,
            phone: normalized.phone,
            city: normalized.city,
            country: normalized.country,
            syncedAt: normalized.syncedAt,
          },
          create: normalized,
        });

        upserted++;
      } catch (error: unknown) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[CONTACTS] Failed to upsert contact ${raw.id}: ${msg}`,
        );
      }
    }

    return { upserted, failed };
  }

  // ─── Normalize ────────────────────────────────────────────────────────────

  private normalize(
    cellId: string,
    raw: ClioContact,
    syncedAt: Date,
  ): NormalizedContact {
    const primaryEmail =
      raw.email_addresses?.find((e) => e.primary)?.address ??
      raw.email_addresses?.[0]?.address ??
      null;

    const primaryPhone =
      raw.phone_numbers?.find((p) => p.primary)?.number ??
      raw.phone_numbers?.[0]?.number ??
      null;

    const primaryAddress =
      raw.addresses?.find((a) => a.primary) ?? raw.addresses?.[0] ?? null;

    return {
      cellId,
      clioContactId: String(raw.id),
      name: raw.name,
      type: raw.type ?? 'Person',
      email: primaryEmail,
      phone: primaryPhone,
      city: primaryAddress?.city ?? null,
      country: primaryAddress?.country ?? null,
      syncedAt,
    };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async findByCellId(cellId: string): Promise<NormalizedContact[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { cellId },
      orderBy: { syncedAt: 'desc' },
    });

    return contacts.map((c) => ({
      cellId: c.cellId,
      clioContactId: c.clioContactId,
      name: c.name,
      type: c.type,
      email: c.email ?? null,
      phone: c.phone ?? null,
      city: c.city ?? null,
      country: c.country ?? null,
      syncedAt: c.syncedAt,
    }));
  }
}
