import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditSchedule } from "./entities/audit-schedule.entity";
import { AuditLog } from "./entities/audit-log.entity";
import { SiteVisit } from "./entities/site-visit.entity";
import { AuditFilterDto } from "./dto/audit-filter.dto";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditSchedule)
    private scheduleRepository: Repository<AuditSchedule>,
    @InjectRepository(AuditLog)
    private logRepository: Repository<AuditLog>,
    @InjectRepository(SiteVisit)
    private siteVisitRepository: Repository<SiteVisit>,
  ) {}

  /**
   * Get audit schedules with optional filters
   */
  async getSchedules(filters?: AuditFilterDto): Promise<AuditSchedule[]> {
    const query = this.scheduleRepository
      .createQueryBuilder("schedule")
      .where("schedule.is_deleted = :isDeleted", { isDeleted: false })
      .leftJoinAndSelect("schedule.cell", "cell");

    if (filters?.cell_id) {
      query.andWhere("schedule.cell_id = :cellId", { cellId: filters.cell_id });
    }

    if (filters?.status) {
      query.andWhere("schedule.status = :status", { status: filters.status });
    }

    query.orderBy("schedule.scheduled_date", "DESC");

    return query.getMany();
  }

  /**
   * Get audit logs with pagination
   */
  async getLogs(userId?: string, limit = 100, offset = 0): Promise<AuditLog[]> {
    const query = this.logRepository
      .createQueryBuilder("log")
      .orderBy("log.created_at", "DESC")
      .skip(offset)
      .take(limit);

    if (userId) {
      query.where("log.user_id = :userId", { userId });
    }

    return query.getMany();
  }

  /**
   * Get site visits for a cell
   */
  async getSiteVisits(cellId: string): Promise<SiteVisit[]> {
    return this.siteVisitRepository.find({
      where: { cell_id: cellId, is_deleted: false },
      relations: ["cell"],
      order: { visit_date: "DESC" },
    });
  }
}
