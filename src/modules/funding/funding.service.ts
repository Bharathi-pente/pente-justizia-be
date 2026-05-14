import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Funding, FundingStatus } from "./entities/funding.entity";
import { FundingFilterDto } from "./dto/funding-filter.dto";

@Injectable()
export class FundingService {
  constructor(
    @InjectRepository(Funding)
    private fundingRepository: Repository<Funding>,
  ) {}

  /**
   * Get funding data with optional filters
   */
  async findAll(filters?: FundingFilterDto): Promise<Funding[]> {
    const query = this.fundingRepository
      .createQueryBuilder("funding")
      .where("funding.is_deleted = :isDeleted", { isDeleted: false })
      .leftJoinAndSelect("funding.cell", "cell");

    if (filters?.cell_id) {
      query.andWhere("funding.cell_id = :cellId", { cellId: filters.cell_id });
    }

    if (filters?.status) {
      query.andWhere("funding.status = :status", { status: filters.status });
    }

    query.orderBy("funding.created_at", "DESC");

    return query.getMany();
  }

  /**
   * Get funding for specific cells (for funder role)
   */
  async findByCellIds(cellIds: string[]): Promise<Funding[]> {
    return this.fundingRepository
      .createQueryBuilder("funding")
      .where("funding.is_deleted = :isDeleted", { isDeleted: false })
      .andWhere("funding.cell_id IN (:...cellIds)", { cellIds })
      .leftJoinAndSelect("funding.cell", "cell")
      .orderBy("funding.created_at", "DESC")
      .getMany();
  }

  /**
   * Calculate total exposure for funder
   */
  async calculateTotalExposure(cellIds?: string[]): Promise<number> {
    const query = this.fundingRepository
      .createQueryBuilder("funding")
      .select("SUM(funding.drawdown_amount)", "total")
      .where("funding.is_deleted = :isDeleted", { isDeleted: false })
      .andWhere("funding.status = :status", { status: FundingStatus.ACTIVE });

    if (cellIds && cellIds.length > 0) {
      query.andWhere("funding.cell_id IN (:...cellIds)", { cellIds });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || "0");
  }
}
