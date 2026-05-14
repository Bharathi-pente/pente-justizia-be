import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";

@Entity("clio_connections")
export class ClioConnection extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @Column({ type: "text" })
  access_token: string; // Encrypted

  @Column({ type: "text" })
  refresh_token: string; // Encrypted

  @Column({ type: "timestamp" })
  expires_at: Date;

  @Column({ type: "varchar", nullable: true })
  scope: string;
}
