import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { ComplianceChecklist } from "./entities/compliance-checklist.entity";
import { ComplianceIssue } from "./entities/compliance-issue.entity";

@Injectable()
export class ComplianceRepository {
  private checklistRepo: Repository<ComplianceChecklist>;
  private issueRepo: Repository<ComplianceIssue>;

  constructor(private dataSource: DataSource) {
    this.checklistRepo = dataSource.getRepository(ComplianceChecklist);
    this.issueRepo = dataSource.getRepository(ComplianceIssue);
  }

  async findChecklistsByCellId(cellId: string): Promise<ComplianceChecklist[]> {
    return this.checklistRepo.find({
      where: { cell_id: cellId, is_deleted: false },
      order: { category: "ASC", created_at: "DESC" },
    });
  }

  async findIssuesByCellId(cellId: string): Promise<ComplianceIssue[]> {
    return this.issueRepo.find({
      where: { cell_id: cellId, is_deleted: false },
      order: { severity: "ASC", created_at: "DESC" },
    });
  }
}
