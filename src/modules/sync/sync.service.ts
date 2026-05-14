// src/modules/sync/sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { MattersService } from '../matters/matters.service';
import { ContactsService } from '../contacts/contacts.service';
import { BillingsService } from '../billings/billings.service';
import { TasksService } from '../tasks/tasks.service';
import { DocumentsService } from '../documents/documents.service';
import { ActivitiesService } from '../activities/activities.service';
import { CellStatus } from '../cells/enums/cell-status.enum';
import { PrismaService } from 'src/prisma/prisma.service';

export interface FullSyncResult {
  cellId: string;
  startedAt: Date;
  completedAt: Date;
  results: {
    entity: string;
    upserted: number;
    error: string | null;
  }[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mattersService: MattersService,
    private readonly contactsService: ContactsService,
    private readonly billingsService: BillingsService,
    private readonly tasksService: TasksService,
    private readonly documentsService: DocumentsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  /**
   * Run a full sync for a cell.
   *
   * Order matters:
   *  1. Matters first — all other entities reference matter IDs
   *  2. Contacts second — needed before contact linking
   *  3. Link contacts → matters
   *  4. Bills, Tasks, Documents, Activities (depend on matters)
   *
   * Each entity is wrapped in its own try/catch.
   * Failure of one entity does NOT abort the rest.
   *
   * Cell status is set to SYNCING for the duration, then:
   *  - CONNECTED if all entities succeed
   *  - SYNC_FAILED if every entity fails
   *  - CONNECTED with partial results if some succeed
   */
  async runFullSync(cellId: string): Promise<FullSyncResult> {
    this.logger.log(`[SYNC] Starting full sync for cell: ${cellId}`);
    const startedAt = new Date();

    await this.prisma.cell.update({
      where: { id: cellId },
      data: { status: CellStatus.SYNCING },
    });

    const results: FullSyncResult['results'] = [];

    // ── Step 1: Matters ──────────────────────────────────────────────────────
    results.push(
      await this.runEntity('MATTERS', () => this.mattersService.sync(cellId)),
    );

    // ── Step 2: Contacts ─────────────────────────────────────────────────────
    results.push(
      await this.runEntity('CONTACTS', () => this.contactsService.sync(cellId)),
    );

    // ── Step 3: Link contacts → matters ──────────────────────────────────────
    // Run only if both matters and contacts succeeded
    const mattersSynced = results.find((r) => r.entity === 'MATTERS');
    const contactsSynced = results.find((r) => r.entity === 'CONTACTS');

    if (!mattersSynced?.error && !contactsSynced?.error) {
      results.push(
        await this.runEntity('MATTER_CONTACT_LINK', () =>
          this.mattersService.linkContacts(cellId),
        ),
      );
    }

    // ── Step 4: Bills, Tasks, Documents, Activities (parallel-safe) ──────────
    results.push(
      await this.runEntity('BILLS', () => this.billingsService.sync(cellId)),
    );

    results.push(
      await this.runEntity('TASKS', () => this.tasksService.sync(cellId)),
    );

    // ── Step 5: Derive deadlines from synced tasks ────────────────────────────
    // Must run AFTER tasks are synced — populates limitationDate, courtDeadline,
    // responseDeadline, proceduralDeadline on each Matter from task due dates
    const tasksSynced = results.find((r) => r.entity === 'TASKS');
    if (!tasksSynced?.error) {
      results.push(
        await this.runEntity('MATTER_DEADLINES', () =>
          this.mattersService.updateDeadlinesForCell(cellId),
        ),
      );
    }

    results.push(
      await this.runEntity('DOCUMENTS', () =>
        this.documentsService.sync(cellId),
      ),
    );
    results.push(
      await this.runEntity('ACTIVITIES', () =>
        this.activitiesService.sync(cellId),
      ),
    );

    // ── Finalize cell status ──────────────────────────────────────────────────
    const allFailed = results.every((r) => r.error !== null);
    const finalStatus = allFailed
      ? CellStatus.SYNC_FAILED
      : CellStatus.CONNECTED;

    await this.prisma.cell.update({
      where: { id: cellId },
      data: { status: finalStatus },
    });

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    this.logger.log(
      `[SYNC] ✅ Full sync complete for cell ${cellId} in ${durationMs}ms — ` +
        `status: ${finalStatus}`,
    );

    return { cellId, startedAt, completedAt, results };
  }

  /**
   * Trigger a targeted re-sync for a specific entity.
   * Used by manual sync endpoints.
   */
  async syncEntity(
    cellId: string,
    entity:
      | 'matters'
      | 'contacts'
      | 'bills'
      | 'tasks'
      | 'documents'
      | 'activities',
  ): Promise<{ entity: string; upserted: number; error: string | null }> {
    const entityMap = {
      matters: () => this.mattersService.sync(cellId),
      contacts: () => this.contactsService.sync(cellId),
      bills: () => this.billingsService.sync(cellId),
      tasks: () => this.tasksService.sync(cellId),
      documents: () => this.documentsService.sync(cellId),
      activities: () => this.activitiesService.sync(cellId),
    };

    return this.runEntity(entity.toUpperCase(), entityMap[entity]);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * Wrap an entity sync in a try/catch so failures are isolated.
   * Returns a result object regardless of success/failure.
   */
  private async runEntity(
    label: string,
    fn: () => Promise<number>,
  ): Promise<{ entity: string; upserted: number; error: string | null }> {
    try {
      this.logger.log(`[SYNC] Running: ${label}`);
      const upserted = await fn();
      this.logger.log(`[SYNC] ✅ ${label}: ${upserted} upserted`);
      return { entity: label, upserted, error: null };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[SYNC] ❌ ${label} failed: ${msg}`);
      return { entity: label, upserted: 0, error: msg };
    }
  }
}
