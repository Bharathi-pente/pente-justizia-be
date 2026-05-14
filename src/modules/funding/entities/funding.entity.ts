import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

export enum FundingStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CLOSED = "closed",
}

@Entity("funding")
export class Funding extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  facility_size: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  drawdown_amount: number;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  available: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  interest_accrued: number;

  @Column({
    type: "enum",
    enum: FundingStatus,
    default: FundingStatus.ACTIVE,
  })
  status: FundingStatus;
}
