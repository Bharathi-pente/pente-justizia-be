import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SyncLogService } from '../sync/sync-log.service';
import { ClioClientService } from '../clio/clio-client.service';
import { SyncEntity } from '../sync/sync.enums';
import type { ClioMatter } from '../clio/clio.types';

export interface NormalizedMatter {
  cellId: string;
  clioMatterId: string;
  title: string;
  status: string;
  stage: string | null;
  description: string | null;
  clientName: string | null;
  practiceArea: string | null;
  openDate: Date | null;
  closeDate: Date | null;
  syncedAt: Date;
  // ── Derived fields ──────────────────────────────────────────────────────
  normalizedStage: string;
  resolutionStatus: string;
  outcomeType: string | null;
  limitationDate: Date | null;
  retentionUntil: Date | null;
  dataConflictFlag: boolean;
  // Deadline fields — populated after task sync via updateDeadlines()
  courtDeadline: Date | null;
  responseDeadline: Date | null;
  proceduralDeadline: Date | null;
  ownerUserId: string | null;
  sourceSystem: string;
  stageId: string | null;
  resolutionNotes: string | null;
}

@Injectable()
export class MattersService {
  private readonly logger = new Logger(MattersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clioClient: ClioClientService,
    private readonly syncLog: SyncLogService,
  ) {}

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async sync(cellId: string): Promise<number> {
    const logId = await this.syncLog.start(cellId, SyncEntity.MATTERS);

    let rawMatters: ClioMatter[] = [];

    try {
      rawMatters = await this.clioClient.fetchMatters(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.syncLog.fail(logId, `Fetch failed: ${msg}`);
      throw error;
    }

    const { upserted, failed } = await this.upsertMatters(cellId, rawMatters);

    if (failed > 0) {
      await this.syncLog.partial(
        logId,
        rawMatters.length,
        upserted,
        `${failed} records failed to upsert`,
      );
    } else {
      await this.syncLog.complete(logId, rawMatters.length, upserted);
    }

    this.logger.log(
      `[MATTERS] Sync complete — fetched: ${rawMatters.length}, upserted: ${upserted}, failed: ${failed}`,
    );

    return upserted;
  }

  // ─── Upsert ───────────────────────────────────────────────────────────────

  private async upsertMatters(
    cellId: string,
    matters: ClioMatter[],
  ): Promise<{ upserted: number; failed: number }> {
    let upserted = 0;
    let failed = 0;
    const syncedAt = new Date();

    for (const raw of matters) {
      try {
        const normalized = this.normalize(cellId, raw, syncedAt);

        await this.prisma.matter.upsert({
          where: {
            cellId_clioMatterId: {
              cellId: normalized.cellId,
              clioMatterId: normalized.clioMatterId,
            },
          },
          update: {
            title: normalized.title,
            status: normalized.status,
            stage: normalized.stage,
            description: normalized.description,
            clientName: normalized.clientName,
            practiceArea: normalized.practiceArea,
            openDate: normalized.openDate,
            closeDate: normalized.closeDate,
            syncedAt: normalized.syncedAt,
            // ── Derived fields ──────────────────────────────────────────
            normalizedStage: normalized.normalizedStage,
            resolutionStatus: normalized.resolutionStatus,
            outcomeType: normalized.outcomeType,
            limitationDate: normalized.limitationDate,
            retentionUntil: normalized.retentionUntil,
            dataConflictFlag: normalized.dataConflictFlag,
            ownerUserId: normalized.ownerUserId,
            sourceSystem: normalized.sourceSystem,
            stageId: normalized.stageId,
          },
          create: normalized,
        });

        upserted++;
      } catch (error: unknown) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[MATTERS] Failed to upsert matter ${raw.id}: ${msg}`,
        );
      }
    }

    return { upserted, failed };
  }

  // ─── Normalize ────────────────────────────────────────────────────────────

  private normalize(
    cellId: string,
    raw: ClioMatter,
    syncedAt: Date,
  ): NormalizedMatter {
    const openDate = raw.open_date ? new Date(raw.open_date) : null;
    const closeDate = raw.close_date ? new Date(raw.close_date) : null;
    const stage = raw.matter_stage?.name ?? null;

    // Extract limitationDate from custom_field_values if present
    const limitationDate = this.extractLimitationDate(raw);

    return {
      cellId,
      clioMatterId: String(raw.id),
      title:
        raw.description?.trim() || raw.display_number || `Matter #${raw.id}`,
      status: raw.status ?? 'unknown',
      stage,
      description: raw.description?.trim() ?? null,
      clientName: raw.client?.name ?? null,
      practiceArea: raw.practice_area?.name ?? null,
      openDate,
      closeDate,
      syncedAt,
      // ── Derived ────────────────────────────────────────────────────────
      normalizedStage: this.normalizeStage(raw.status, stage),
      resolutionStatus: this.resolveResolutionStatus(raw.status),
      outcomeType: this.resolveOutcomeType(raw.status, stage),
      limitationDate,
      retentionUntil: this.calcRetentionUntil(closeDate),
      dataConflictFlag: false, // business rule — populated by future rules engine
      // Deadlines populated after task sync via updateDeadlinesForCell()
      courtDeadline: null,
      responseDeadline: null,
      proceduralDeadline: null,
      ownerUserId: raw.responsible_attorney
        ? String(raw.responsible_attorney.id)
        : null,
      sourceSystem: 'CLIO',
      stageId: this.resolveStageId(raw.status, stage),
      resolutionNotes: null, // manual entry — never from Clio
    };
  }

  /**
   * Maps normalizedStage → internal integer stage ID.
   * Used for stage-based filtering and reporting.
   */
  private resolveStageId(status: string, stage: string | null): string | null {
    const normalized = this.normalizeStage(status, stage);

    const stageMap: Record<string, string> = {
      INTAKE: 'stage_1',
      LETTER_OF_CLAIM: 'stage_2',
      AWAITING_RESPONSE: 'stage_3',
      NEGOTIATION: 'stage_4',
      SETTLEMENT: 'stage_5',
      CLOSED: 'stage_6',
    };

    return stageMap[normalized] ?? 'stage_1';
  }
  // ─── Derivation helpers ───────────────────────────────────────────────────

  /**
   * Maps Clio status + stage name → one of 6 pipeline stages.
   *
   * INTAKE → LETTER_OF_CLAIM → AWAITING_RESPONSE →
   * NEGOTIATION → SETTLEMENT → CLOSED
   */
  private normalizeStage(status: string, stage: string | null): string {
    if (status === 'Closed') return 'CLOSED';
    if (status === 'Pending') return 'SETTLEMENT';

    const s = stage?.toLowerCase() ?? '';
    if (s.includes('settlement')) return 'SETTLEMENT';
    if (s.includes('negotiat')) return 'NEGOTIATION';
    if (s.includes('awaiting')) return 'AWAITING_RESPONSE';
    if (s.includes('letter')) return 'LETTER_OF_CLAIM';

    return 'INTAKE';
  }

  /**
   * Maps Clio matter status → resolution status.
   * OPEN | PENDING | CLOSED
   */
  private resolveResolutionStatus(status: string): string {
    switch (status) {
      case 'Closed':
        return 'CLOSED';
      case 'Pending':
        return 'PENDING';
      default:
        return 'OPEN';
    }
  }

  /**
   * Derives outcome type from status and stage keywords.
   * Won | Lost | Settled | Withdrawn | null (still active)
   */
  private resolveOutcomeType(
    status: string,
    stage: string | null,
  ): string | null {
    const s = stage?.toLowerCase() ?? '';

    if (s.includes('settled')) return 'Settled';
    if (s.includes('won')) return 'Won';
    if (s.includes('lost')) return 'Lost';
    if (s.includes('withdrawn')) return 'Withdrawn';
    if (status === 'Closed') return 'Closed';

    return null; // still active — no outcome yet
  }

  /**
   * Extracts limitation date from Clio custom_field_values.
   * Looks for fields with "limitation" in the name.
   */
  private extractLimitationDate(raw: ClioMatter): Date | null {
    const customFields = raw.custom_field_values ?? [];

    const field = customFields.find((f) => {
      const name = (f.field_name ?? f.name ?? '').toLowerCase();
      return name.includes('limitation');
    });

    if (!field?.value) return null;

    const date = new Date(String(field.value));
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Retention until = close date + 7 years (SRA requirement).
   * Returns null if matter is not closed yet.
   */
  private calcRetentionUntil(closeDate: Date | null): Date | null {
    if (!closeDate) return null;
    const retention = new Date(closeDate);
    retention.setFullYear(retention.getFullYear() + 7);
    return retention;
  }

  // ─── Update deadlines from tasks ──────────────────────────────────────────

  /**
   * Run AFTER task sync to populate deadline fields from task due dates.
   * Matches tasks by name keywords to each deadline type.
   *
   * Call from SyncService after TASKS sync step.
   */
  async updateDeadlinesForCell(cellId: string): Promise<number> {
    this.logger.log(
      `[MATTERS] Updating deadlines from tasks for cell ${cellId}`,
    );

    const matters = await this.prisma.matter.findMany({
      where: { cellId },
      include: {
        tasks: {
          select: { name: true, dueDate: true },
        },
      },
    });

    let updated = 0;

    for (const matter of matters as any[]) {
      const tasks: { name: string; dueDate: Date | null }[] = (
        matter.tasks ?? []
      ).filter((t) => t.dueDate !== null);
      // Debug — remove after confirming deadlines populate
      this.logger.debug(
        `[MATTERS] Matter ${matter.id} tasks: ${JSON.stringify(
          tasks.map((t) => ({ name: t.name, dueDate: t.dueDate })),
        )}`,
      );

      // Match against your actual Clio task names
      const limitationDate =
        tasks.find((t) => t.name?.toLowerCase().includes('limitation'))
          ?.dueDate ?? null;

      // ADD THIS DEBUG
      this.logger.debug(
        `[DEADLINES] Matter ${matter.clioMatterId} | limitationDate resolved: ${limitationDate}`,
      );

      const courtDeadline =
        tasks.find(
          (t) =>
            t.name?.toLowerCase().includes('court') ||
            t.name?.toLowerCase().includes('civil litigation') ||
            t.name?.toLowerCase().includes('review hdr'),
        )?.dueDate ?? null;

      const responseDeadline =
        tasks.find(
          (t) =>
            t.name?.toLowerCase().includes('initial review') ||
            t.name?.toLowerCase().includes('hdr initial'),
        )?.dueDate ?? null;

      const proceduralDeadline =
        tasks.find(
          (t) =>
            t.name?.toLowerCase().includes('debt recovery') ||
            t.name?.toLowerCase().includes('employment') ||
            t.name?.toLowerCase().includes('probate'),
        )?.dueDate ?? null;

      // Skip if nothing found
      if (
        !limitationDate &&
        !courtDeadline &&
        !responseDeadline &&
        !proceduralDeadline
      )
        continue;

      await this.prisma.matter.update({
        where: { id: matter.id },
        data: {
          limitationDate, // ← now populated from task, not custom_field_values
          courtDeadline,
          responseDeadline,
          proceduralDeadline,
        },
      });

      updated++;
    }

    this.logger.log(`[MATTERS] ✅ Updated deadlines for ${updated} matters`);
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findByCellId(cellId: string): Promise<NormalizedMatter[]> {
    const matters = await this.prisma.matter.findMany({
      where: { cellId },
      orderBy: { syncedAt: 'desc' },
    });

    return matters.map((m) => ({
      cellId: m.cellId,
      clioMatterId: m.clioMatterId,
      title: m.title,
      status: m.status,
      stage: m.stage ?? null,
      description: m.description ?? null,
      clientName: m.clientName ?? null,
      practiceArea: m.practiceArea ?? null,
      openDate: m.openDate ?? null,
      closeDate: m.closeDate ?? null,
      syncedAt: m.syncedAt,
      normalizedStage: (m as any).normalizedStage ?? 'INTAKE',
      resolutionStatus: (m as any).resolutionStatus ?? 'OPEN',
      outcomeType: (m as any).outcomeType ?? null,
      limitationDate: (m as any).limitationDate ?? null,
      retentionUntil: (m as any).retentionUntil ?? null,
      dataConflictFlag: (m as any).dataConflictFlag ?? false,
      courtDeadline: (m as any).courtDeadline ?? null,
      responseDeadline: (m as any).responseDeadline ?? null,
      proceduralDeadline: (m as any).proceduralDeadline ?? null,
      ownerUserId: (m as any).ownerUserId ?? null,
      sourceSystem: (m as any).sourceSystem ?? 'CLIO',
      stageId: (m as any).stageId ?? null,
      resolutionNotes: (m as any).resolutionNotes ?? null,
    }));
  }

  // ─── Link contacts ────────────────────────────────────────────────────────

  async linkContacts(cellId: string): Promise<number> {
    this.logger.log(`[MATTERS] Linking contacts for cell ${cellId}`);

    const matters = await this.prisma.matter.findMany({
      where: { cellId },
      select: { id: true, clioMatterId: true, clientName: true },
    });

    let linked = 0;

    for (const matter of matters) {
      if (!matter.clientName) continue;

      const contact = await this.prisma.contact.findFirst({
        where: { cellId, name: matter.clientName },
        select: { id: true },
      });

      if (!contact) continue;

      await this.prisma.matterContact.upsert({
        where: {
          matterId_contactId: {
            matterId: matter.id,
            contactId: contact.id,
          },
        },
        update: { role: 'client' },
        create: {
          matterId: matter.id,
          contactId: contact.id,
          role: 'client',
        },
      });

      linked++;
    }

    this.logger.log(`[MATTERS] ✅ Linked ${linked} contacts`);
    return linked;
  }
}
