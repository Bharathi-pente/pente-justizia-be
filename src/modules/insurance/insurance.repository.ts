import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import {
  InsurancePolicy,
  PolicyStatus,
} from "./entities/insurance-policy.entity";

@Injectable()
export class InsuranceRepository extends Repository<InsurancePolicy> {
  constructor(private dataSource: DataSource) {
    super(InsurancePolicy, dataSource.createEntityManager());
  }

  async findByCellId(cellId: string): Promise<InsurancePolicy[]> {
    return this.find({
      where: { cell_id: cellId, is_deleted: false },
      relations: ["cell", "case"],
      order: { created_at: "DESC" },
    });
  }

  async findByCaseId(caseId: string): Promise<InsurancePolicy[]> {
    return this.find({
      where: { case_id: caseId, is_deleted: false },
      relations: ["cell", "case"],
    });
  }

  async findActivePolicies(): Promise<InsurancePolicy[]> {
    return this.find({
      where: { status: PolicyStatus.ACTIVE, is_deleted: false },
      relations: ["cell", "case"],
      order: { created_at: "DESC" },
    });
  }
}
