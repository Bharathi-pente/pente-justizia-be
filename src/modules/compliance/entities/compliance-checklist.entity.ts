import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

export enum ComplianceCategory {
  CLIENT_IDENTIFICATION = "client_identification",
  ANTI_MONEY_LAUNDERING = "anti_money_laundering",
  CONFLICTS_OF_INTEREST = "conflicts_of_interest",
  CLIENT_CARE = "client_care",
  COMPLAINTS_HANDLING = "complaints_handling",
  FINANCIAL_CONTROLS = "financial_controls",
  RISK_MANAGEMENT = "risk_management",
  DATA_PROTECTION = "data_protection",
}

export enum ComplianceStatus {
  COMPLIANT = "compliant",
  NON_COMPLIANT = "non_compliant",
  PARTIALLY_COMPLIANT = "partially_compliant",
  NOT_CHECKED = "not_checked",
}

@Entity("compliance_checklists")
export class ComplianceChecklist extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({
    type: "enum",
    enum: ComplianceCategory,
  })
  category: ComplianceCategory;

  @Column({ type: "varchar" })
  item: string;

  @Column({
    type: "enum",
    enum: ComplianceStatus,
    default: ComplianceStatus.NOT_CHECKED,
  })
  status: ComplianceStatus;

  @Column({ type: "timestamp", nullable: true })
  last_checked_at: Date;
}
