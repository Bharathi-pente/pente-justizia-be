import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

export enum AuditStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity("audit_schedules")
export class AuditSchedule extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({ type: "timestamp" })
  scheduled_date: Date;

  @Column({
    type: "enum",
    enum: AuditStatus,
    default: AuditStatus.SCHEDULED,
  })
  status: AuditStatus;

  @Column({ type: "integer", nullable: true })
  last_score: number;

  @Column({ type: "uuid", nullable: true })
  assigned_to: string;
}
