import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { User } from "../../users/entities/user.entity";

export enum CellStatus {
  PIPELINE = "pipeline",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CLOSED = "closed",
}

export enum CellVertical {
  HOUSING_DISREPAIR = "housing_disrepair",
  PCP_MISSELLING = "pcp_misselling",
  DATA_BREACH = "data_breach",
  PROFESSIONAL_NEGLIGENCE = "professional_negligence",
  COMMERCIAL_CONVEYANCING = "commercial_conveyancing",
  EMPLOYMENT_LAW = "employment_law",
  IMMIGRATION = "immigration",
  FAMILY_LAW = "family_law",
  PERSONAL_INJURY = "personal_injury",
  MEDICAL_NEGLIGENCE = "medical_negligence",
  WILLS_PROBATE = "wills_probate",
  PROPERTY_DISPUTES = "property_disputes",
  CONTRACT_DISPUTES = "contract_disputes",
  DEBT_RECOVERY = "debt_recovery",
  INSOLVENCY = "insolvency",
  INTELLECTUAL_PROPERTY = "intellectual_property",
  REGULATORY_COMPLIANCE = "regulatory_compliance",
  TAX_LAW = "tax_law",
}

@Entity("cells")
export class Cell extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({
    type: "enum",
    enum: CellVertical,
  })
  vertical: CellVertical;

  @Column({
    type: "enum",
    enum: CellStatus,
    default: CellStatus.PIPELINE,
  })
  status: CellStatus;

  @Column({ type: "varchar", nullable: true })
  company_number: string;

  @Column({ type: "varchar", nullable: true })
  clio_instance_id: string;

  @Column({ type: "boolean", default: false })
  is_funded: boolean;

  @OneToMany(() => User, (user) => user.cell)
  users: User[];
}
