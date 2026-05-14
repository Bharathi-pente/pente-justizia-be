import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";

export enum NotificationType {
  COMPLIANCE_ALERT = "compliance_alert",
  AUDIT_REMINDER = "audit_reminder",
  CASE_UPDATE = "case_update",
  FUNDING_ALERT = "funding_alert",
  SYSTEM = "system",
}

@Entity("notifications")
export class Notification extends BaseEntity {
  @Column({ type: "uuid" })
  user_id: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "boolean", default: false })
  read: boolean;
}
