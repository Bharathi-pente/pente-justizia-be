import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../database/base.entity";
import { Cell } from "../../cells/entities/cell.entity";

@Entity("site_visits")
export class SiteVisit extends BaseEntity {
  @Column({ type: "uuid" })
  cell_id: string;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: "cell_id" })
  cell: Cell;

  @Column({ type: "timestamp" })
  visit_date: Date;

  @Column({ type: "varchar" })
  conducted_by: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "integer", default: 0 })
  actions_raised: number;
}
