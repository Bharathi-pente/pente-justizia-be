import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ComplianceChecklist,
  ComplianceStatus,
} from "./entities/compliance-checklist.entity";
import { ComplianceIssue } from "./entities/compliance-issue.entity";
import { ComplianceFilterDto } from "./dto/compliance-filter.dto";

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceChecklist)
    private checklistRepository: Repository<ComplianceChecklist>,
    @InjectRepository(ComplianceIssue)
    private issueRepository: Repository<ComplianceIssue>,
  ) {}

  /**
   * Get compliance checklists with optional filters
   */
  async getChecklists(
    filters?: ComplianceFilterDto,
  ): Promise<ComplianceChecklist[]> {
    const query = this.checklistRepository
      .createQueryBuilder("checklist")
      .where("checklist.is_deleted = :isDeleted", { isDeleted: false })
      .leftJoinAndSelect("checklist.cell", "cell");

    if (filters?.cell_id) {
      query.andWhere("checklist.cell_id = :cellId", {
        cellId: filters.cell_id,
      });
    }

    if (filters?.category) {
      query.andWhere("checklist.category = :category", {
        category: filters.category,
      });
    }

    if (filters?.status) {
      query.andWhere("checklist.status = :status", { status: filters.status });
    }

    query.orderBy("checklist.category", "ASC");

    return query.getMany();
  }

  /**
   * Get compliance issues with optional filters
   */
  async getIssues(filters?: ComplianceFilterDto): Promise<ComplianceIssue[]> {
    const query = this.issueRepository
      .createQueryBuilder("issue")
      .where("issue.is_deleted = :isDeleted", { isDeleted: false })
      .leftJoinAndSelect("issue.cell", "cell");

    if (filters?.cell_id) {
      query.andWhere("issue.cell_id = :cellId", { cellId: filters.cell_id });
    }

    if (filters?.severity) {
      query.andWhere("issue.severity = :severity", {
        severity: filters.severity,
      });
    }

    if (filters?.issue_status) {
      query.andWhere("issue.status = :status", {
        status: filters.issue_status,
      });
    }

    query.orderBy("issue.severity", "ASC").addOrderBy("issue.age_days", "DESC");

    return query.getMany();
  }

  /**
   * Calculate compliance score for a cell
   */
  async calculateComplianceScore(cellId: string): Promise<number> {
    const checklists = await this.checklistRepository.find({
      where: { cell_id: cellId, is_deleted: false },
    });

    if (checklists.length === 0) {
      return 0;
    }

    const compliantCount = checklists.filter(
      (c) => c.status === ComplianceStatus.COMPLIANT,
    ).length;
    const partiallyCompliantCount = checklists.filter(
      (c) => c.status === ComplianceStatus.PARTIALLY_COMPLIANT,
    ).length;

    // Full points for compliant, half points for partially compliant
    const totalPoints = compliantCount + partiallyCompliantCount * 0.5;

    return Math.round((totalPoints / checklists.length) * 100);
  }
}
