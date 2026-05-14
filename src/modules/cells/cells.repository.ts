import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Cell, CellStatus } from "./entities/cell.entity";

@Injectable()
export class CellsRepository extends Repository<Cell> {
  constructor(private dataSource: DataSource) {
    super(Cell, dataSource.createEntityManager());
  }

  async findActiveCells(): Promise<Cell[]> {
    return this.find({
      where: { status: CellStatus.ACTIVE, is_deleted: false },
      order: { created_at: "DESC" },
    });
  }

  async findFundedCells(): Promise<Cell[]> {
    return this.find({
      where: { is_funded: true, is_deleted: false },
      order: { created_at: "DESC" },
    });
  }
}
