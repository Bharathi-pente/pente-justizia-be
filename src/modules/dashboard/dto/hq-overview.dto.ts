// src/modules/dashboard/dto/hq-overview.dto.ts

export class HqSummaryDto {
  activeCells!: number;
  totalCells!: number;
  totalMatters!: number;
  totalOpenMatters!: number;
  grossRecovery!: number;
  totalDue!: number;
  lastSyncedAt!: Date | null;
}

export class CellPerformanceDto {
  cellId!: string;
  cellName!: string;
  status!: string;
  matters!: number;
  openMatters!: number;
  grossRecovery!: number;
  totalDue!: number;
  overdueTaskCount!: number;
  documentCount!: number;
  avgCycleDays!: number | null;
  lastSyncedAt!: Date | null;
}

export class HqOverviewResponseDto {
  summary!: HqSummaryDto;
  pipeline!: { stage: string; count: number }[];
  cells!: CellPerformanceDto[];
}
