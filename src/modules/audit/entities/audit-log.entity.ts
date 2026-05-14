import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";

@Entity("audit_logs")
export class AuditLog extends BaseEntity {
  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "varchar" })
  action: string;

  @Column({ type: "varchar" })
  resource: string;

  @Column({ type: "varchar", nullable: true })
  resource_id: string;

  @Column({ type: "varchar", nullable: true })
  ip: string;
}
