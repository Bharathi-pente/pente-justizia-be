import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";
import { Case } from "../../cases/entities/case.entity";

export enum PolicyStatus {
  ACTIVE = "active",
  PENDING = "pending",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

@Entity("insurance_policies")
export class InsurancePolicy extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({ type: "uuid", nullable: true })
  case_id: string;

  @ManyToOne(() => Case, { nullable: true })
  @JoinColumn({ name: "case_id" })
  case: Case;

  @Column({ type: "varchar", unique: true })
  policy_number: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  cover_amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  premium: number;

  @Column({
    type: "enum",
    enum: PolicyStatus,
    default: PolicyStatus.PENDING,
  })
  status: PolicyStatus;

  @Column({ type: "timestamp", nullable: true })
  issued_at: Date;
}
