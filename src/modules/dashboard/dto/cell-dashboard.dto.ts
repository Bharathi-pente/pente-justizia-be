// src/modules/dashboard/dto/cell-dashboard.dto.ts

export class SyncEntityStatusDto {
  entity!: string;
  status!: string;
  lastRun!: Date | null;
  recordsUpserted!: number;
}

export class SyncStatusDto {
  lastSyncedAt!: Date | null;
  entityStatuses!: SyncEntityStatusDto[];
}

export class MatterStageDto {
  stage!: string;
  count!: number;
}

export class MatterMetricsDto {
  total!: number;
  open!: number;
  closed!: number;
  pending!: number;
  byStage!: MatterStageDto[];
  avgCycleDays!: number | null;
}

export class FinancialsDto {
  grossRecovery!: number;
  totalBilled!: number;
  totalPaid!: number;
  totalDue!: number;
  collectionRate!: number | null;
}

export class TaskMetricsDto {
  total!: number;
  incomplete!: number;
  overdue!: number;
}

export class PipelineStageDto {
  stage!: string;
  count!: number;
}

export class CellDashboardResponseDto {
  cellId!: string;
  cellName!: string;
  status!: string;
  sync!: SyncStatusDto;
  matters!: MatterMetricsDto;
  financials!: FinancialsDto;
  contacts!: { total: number };
  tasks!: TaskMetricsDto;
  documents!: { total: number };
  activities!: { total: number };
  pipeline!: PipelineStageDto[];
}
