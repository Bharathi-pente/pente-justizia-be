import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

export enum UserRole {
  HQ_ADMIN = "hq_admin", // Justizia HQ — full access all cells
  HQ_COMPLIANCE = "hq_compliance", // Maya/Mo — compliance + audit all cells
  HQ_BDM = "hq_bdm", // Jeff — read access + cell pipeline
  CELL_ADMIN = "cell_admin", // Cell Operator — admin of own cell
  CELL_SOLICITOR = "cell_solicitor", // Solicitor under a cell
  CELL_PARALEGAL = "cell_paralegal", // Paralegal under a cell
  FUNDER = "funder", // 7 Stars — funded cells read-only
  INSURER = "insurer", // FairShield — all cells ATE data read-only
}

export enum ConsentStatus {
  PENDING = "PENDING",
  GRANTED = "GRANTED",
  DENIED = "DENIED",
}

export enum OnboardingStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum ClientType {
  INDIVIDUAL = "INDIVIDUAL",
  CORPORATE = "CORPORATE",
  GOVERNMENT = "GOVERNMENT",
  NON_PROFIT = "NON_PROFIT",
}

@Entity("users")
export class User extends BaseEntity {
  @Column({ type: "varchar", unique: true })
  keycloak_id: string;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar" })
  full_name: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.CELL_PARALEGAL,
  })
  role: UserRole;

  @Column({ type: "uuid", nullable: true })
  cell_id: string | null;

  @ManyToOne(() => Cell, { nullable: true })
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  // Client / Contact Variables
  @Column({ type: "varchar", nullable: true })
  client_name: string | null;

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ type: "enum", enum: ConsentStatus, nullable: true })
  consent_status: ConsentStatus | null;

  @Column({ type: "boolean", default: false })
  gdpr_status: boolean;

  @Column({ type: "boolean", default: false })
  verification_status: boolean;

  @Column({
    type: "enum",
    enum: OnboardingStatus,
    default: OnboardingStatus.NOT_STARTED,
  })
  onboarding_status: OnboardingStatus;

  @Column({ type: "int", default: 0 })
  linked_case_count: number;

  @Column({ type: "enum", enum: ClientType, nullable: true })
  client_type: ClientType | null;

  @Column({ type: "boolean", default: false })
  vulnerability_flag: boolean;

  @Column({ type: "varchar", nullable: true })
  preferred_contact_method: string | null;
}
