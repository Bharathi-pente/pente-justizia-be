import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { AuditSchedule } from "./entities/audit-schedule.entity";
import { AuditLog } from "./entities/audit-log.entity";
import { SiteVisit } from "./entities/site-visit.entity";

@Injectable()
export class AuditRepository {
  private scheduleRepo: Repository<AuditSchedule>;
  private logRepo: Repository<AuditLog>;
  private siteVisitRepo: Repository<SiteVisit>;

  constructor(private dataSource: DataSource) {
    this.scheduleRepo = dataSource.getRepository(AuditSchedule);
    this.logRepo = dataSource.getRepository(AuditLog);
    this.siteVisitRepo = dataSource.getRepository(SiteVisit);
  }

  async findSchedulesByCellId(cellId: string): Promise<AuditSchedule[]> {
    return this.scheduleRepo.find({
      where: { cell_id: cellId, is_deleted: false },
      order: { scheduled_date: "DESC" },
    });
  }

  async findLogsByUserId(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.logRepo.find({
      where: { user_id: userId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  async findSiteVisitsByCellId(cellId: string): Promise<SiteVisit[]> {
    return this.siteVisitRepo.find({
      where: { cell_id: cellId, is_deleted: false },
      order: { visit_date: "DESC" },
    });
  }
}
