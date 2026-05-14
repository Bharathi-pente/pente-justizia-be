import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Case, CaseStatus } from "../cases/entities/case.entity";
import {
  ComplianceIssue,
  IssueSeverity,
  IssueStatus,
} from "../compliance/entities/compliance-issue.entity";
import { Funding } from "../funding/entities/funding.entity";
import {
  InsurancePolicy,
  PolicyStatus,
} from "../insurance/entities/insurance-policy.entity";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Case)
    private casesRepository: Repository<Case>,
    @InjectRepository(ComplianceIssue)
    private complianceRepository: Repository<ComplianceIssue>,
    @InjectRepository(Funding)
    private fundingRepository: Repository<Funding>,
    @InjectRepository(InsurancePolicy)
    private insuranceRepository: Repository<InsurancePolicy>,
  ) {}

  /**
   * Get dashboard data for HQ Admin role
   */
  async getHqAdminDashboard() {
    const [totalCases, openCases, activeCells, criticalIssues] =
      await Promise.all([
        this.casesRepository.count({ where: { is_deleted: false } }),
        this.casesRepository.count({
          where: { status: CaseStatus.IN_PROGRESS, is_deleted: false },
        }),
        this.casesRepository
          .createQueryBuilder("case")
          .select("COUNT(DISTINCT case.cell_id)", "count")
          .where("case.is_deleted = :isDeleted", { isDeleted: false })
          .getRawOne()
          .then((r) => parseInt(r.count)),
        this.complianceRepository.count({
          where: {
            severity: IssueSeverity.CRITICAL,
            status: IssueStatus.OPEN,
            is_deleted: false,
          },
        }),
      ]);

    return {
      total_cases: totalCases,
      open_cases: openCases,
      active_cells: activeCells,
      critical_issues: criticalIssues,
    };
  }

  /**
   * Get dashboard data for HQ Compliance role
   */
  async getHqComplianceDashboard() {
    const [totalIssues, criticalIssues, highIssues, pendingAudits] =
      await Promise.all([
        this.complianceRepository.count({
          where: { status: IssueStatus.OPEN, is_deleted: false },
        }),
        this.complianceRepository.count({
          where: {
            severity: IssueSeverity.CRITICAL,
            status: IssueStatus.OPEN,
            is_deleted: false,
          },
        }),
        this.complianceRepository.count({
          where: {
            severity: IssueSeverity.HIGH,
            status: IssueStatus.OPEN,
            is_deleted: false,
          },
        }),
        // This would query audit schedules - simplified for now
        0,
      ]);

    return {
      total_open_issues: totalIssues,
      critical_issues: criticalIssues,
      high_issues: highIssues,
      pending_audits: pendingAudits,
    };
  }

  /**
   * Get dashboard data for HQ BDM role
   */
  async getHqBdmDashboard() {
    const [pipelineCells, activeCells, totalRevenue] = await Promise.all([
      // This would query cells with status 'pipeline' - simplified for now
      0,
      // This would query cells with status 'active' - simplified for now
      0,
      this.casesRepository
        .createQueryBuilder("case")
        .select("SUM(case.gross_recovery)", "total")
        .where("case.is_deleted = :isDeleted", { isDeleted: false })
        .andWhere("case.gross_recovery IS NOT NULL")
        .getRawOne()
        .then((r) => parseFloat(r.total || "0")),
    ]);

    return {
      pipeline_cells: pipelineCells,
      active_cells: activeCells,
      total_revenue: totalRevenue,
    };
  }

  /**
   * Get dashboard data for Cell Admin role
   */
  async getCellAdminDashboard(cellId: string) {
    const [totalCases, activeCases, complianceScore, openIssues] =
      await Promise.all([
        this.casesRepository.count({
          where: { cell_id: cellId, is_deleted: false },
        }),
        this.casesRepository.count({
          where: {
            cell_id: cellId,
            status: CaseStatus.IN_PROGRESS,
            is_deleted: false,
          },
        }),
        // This would call compliance service to get score - simplified for now
        85,
        this.complianceRepository.count({
          where: {
            cell_id: cellId,
            status: IssueStatus.OPEN,
            is_deleted: false,
          },
        }),
      ]);

    return {
      total_cases: totalCases,
      active_cases: activeCases,
      compliance_score: complianceScore,
      open_issues: openIssues,
    };
  }

  /**
   * Get dashboard data for Funder role
   */
  async getFunderDashboard(fundedCellIds: string[]) {
    const [totalFunded, totalDrawdown, activePolicies] = await Promise.all([
      this.fundingRepository
        .createQueryBuilder("funding")
        .select("COUNT(*)", "count")
        .where("funding.cell_id IN (:...cellIds)", { cellIds: fundedCellIds })
        .andWhere("funding.is_deleted = :isDeleted", { isDeleted: false })
        .getRawOne()
        .then((r) => parseInt(r.count)),
      this.fundingRepository
        .createQueryBuilder("funding")
        .select("SUM(funding.drawdown_amount)", "total")
        .where("funding.cell_id IN (:...cellIds)", { cellIds: fundedCellIds })
        .andWhere("funding.is_deleted = :isDeleted", { isDeleted: false })
        .getRawOne()
        .then((r) => parseFloat(r.total || "0")),
      this.casesRepository.count({
        where: { is_deleted: false },
      }),
    ]);

    return {
      total_funded_cells: totalFunded,
      total_drawdown: totalDrawdown,
      active_policies: activePolicies,
    };
  }

  /**
   * Get dashboard data for Insurer role
   */
  async getInsurerDashboard() {
    const [totalPolicies, totalExposure, activePolicies] = await Promise.all([
      this.insuranceRepository.count({ where: { is_deleted: false } }),
      this.insuranceRepository
        .createQueryBuilder("policy")
        .select("SUM(policy.cover_amount)", "total")
        .where("policy.is_deleted = :isDeleted", { isDeleted: false })
        .andWhere("policy.status = :status", { status: PolicyStatus.ACTIVE })
        .getRawOne()
        .then((r) => parseFloat(r.total || "0")),
      this.insuranceRepository.count({
        where: { status: PolicyStatus.ACTIVE, is_deleted: false },
      }),
    ]);

    return {
      total_policies: totalPolicies,
      total_exposure: totalExposure,
      active_policies: activePolicies,
    };
  }
}
