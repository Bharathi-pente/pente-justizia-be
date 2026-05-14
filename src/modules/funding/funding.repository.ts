import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Funding, FundingStatus } from "./entities/funding.entity";

@Injectable()
export class FundingRepository extends Repository<Funding> {
  constructor(private dataSource: DataSource) {
    super(Funding, dataSource.createEntityManager());
  }

  async findByCellId(cellId: string): Promise<Funding | null> {
    return this.findOne({
      where: { cell_id: cellId, is_deleted: false },
    });
  }

  async findActiveFunding(): Promise<Funding[]> {
    return this.find({
      where: { status: FundingStatus.ACTIVE, is_deleted: false },
      relations: ["cell"],
      order: { created_at: "DESC" },
    });
  }
}
