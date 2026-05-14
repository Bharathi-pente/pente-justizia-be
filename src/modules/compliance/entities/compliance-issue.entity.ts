import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

export enum IssueSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum IssueStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

@Entity("compliance_issues")
export class ComplianceIssue extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({
    type: "enum",
    enum: IssueSeverity,
  })
  severity: IssueSeverity;

  @Column({ type: "varchar" })
  sra_rule: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "uuid", nullable: true })
  assigned_to: string;

  @Column({
    type: "enum",
    enum: IssueStatus,
    default: IssueStatus.OPEN,
  })
  status: IssueStatus;

  @Column({ type: "integer", default: 0 })
  age_days: number;
}
