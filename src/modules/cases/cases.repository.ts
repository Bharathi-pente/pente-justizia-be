import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Case } from "./entities/case.entity";

@Injectable()
export class CasesRepository extends Repository<Case> {
  constructor(private dataSource: DataSource) {
    super(Case, dataSource.createEntityManager());
  }

  async findByCellId(cellId: string): Promise<Case[]> {
    return this.find({
      where: { cell_id: cellId, is_deleted: false },
      order: { created_at: "DESC" },
    });
  }

  async findByCliomatterId(clioMatterId: string): Promise<Case | null> {
    return this.findOne({
      where: { clio_matter_id: clioMatterId, is_deleted: false },
    });
  }
}
