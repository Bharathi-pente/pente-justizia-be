import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  InsurancePolicy,
  PolicyStatus,
} from "./entities/insurance-policy.entity";
import { InsuranceFilterDto } from "./dto/insurance-filter.dto";

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(InsurancePolicy)
    private insuranceRepository: Repository<InsurancePolicy>,
  ) {}

  /**
   * Get insurance policies with optional filters
   */
  async findAll(filters?: InsuranceFilterDto): Promise<InsurancePolicy[]> {
    const query = this.insuranceRepository
      .createQueryBuilder("policy")
      .where("policy.is_deleted = :isDeleted", { isDeleted: false })
      .leftJoinAndSelect("policy.cell", "cell")
      .leftJoinAndSelect("policy.case", "case");

    if (filters?.cell_id) {
      query.andWhere("policy.cell_id = :cellId", { cellId: filters.cell_id });
    }

    if (filters?.case_id) {
      query.andWhere("policy.case_id = :caseId", { caseId: filters.case_id });
    }

    if (filters?.status) {
      query.andWhere("policy.status = :status", { status: filters.status });
    }

    query.orderBy("policy.created_at", "DESC");

    return query.getMany();
  }

  /**
   * Calculate total ATE exposure
   */
  async calculateTotalExposure(cellIds?: string[]): Promise<number> {
    const query = this.insuranceRepository
      .createQueryBuilder("policy")
      .select("SUM(policy.cover_amount)", "total")
      .where("policy.is_deleted = :isDeleted", { isDeleted: false })
      .andWhere("policy.status = :status", { status: PolicyStatus.ACTIVE });

    if (cellIds && cellIds.length > 0 && cellIds[0] !== "*") {
      query.andWhere("policy.cell_id IN (:...cellIds)", { cellIds });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || "0");
  }

  /**
   * Calculate total premium collected
   */
  async calculateTotalPremium(cellIds?: string[]): Promise<number> {
    const query = this.insuranceRepository
      .createQueryBuilder("policy")
      .select("SUM(policy.premium)", "total")
      .where("policy.is_deleted = :isDeleted", { isDeleted: false })
      .andWhere("policy.status = :status", { status: PolicyStatus.ACTIVE });

    if (cellIds && cellIds.length > 0 && cellIds[0] !== "*") {
      query.andWhere("policy.cell_id IN (:...cellIds)", { cellIds });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || "0");
  }
}
