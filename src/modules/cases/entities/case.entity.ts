import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

export enum CaseStage {
  INQUIRY = "inquiry",
  ONBOARDING = "onboarding",
  ACTIVE = "active",
  NEGOTIATION = "negotiation",
  LITIGATION = "litigation",
  SETTLEMENT = "settlement",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
}

export enum CaseStatus {
  NEW = "new",
  IN_PROGRESS = "in_progress",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity("cases")
export class Case extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({ type: "varchar", nullable: true })
  clio_matter_id: string;

  @Column({
    type: "enum",
    enum: CaseStage,
    default: CaseStage.INQUIRY,
  })
  stage: CaseStage;

  @Column({
    type: "enum",
    enum: CaseStatus,
    default: CaseStatus.NEW,
  })
  status: CaseStatus;

  @Column({ type: "varchar" })
  vertical: string;

  @Column({ type: "varchar" })
  client_name: string;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  gross_recovery: number;

  @Column({ type: "timestamp", nullable: true })
  opened_at: Date;

  @Column({ type: "timestamp", nullable: true })
  closed_at: Date;

  @Column({ type: "integer", nullable: true })
  cycle_time_days: number;
}
