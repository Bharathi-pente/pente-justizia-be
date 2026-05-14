import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { AuditRepository } from "./audit.repository";
import { AuditSchedule } from "./entities/audit-schedule.entity";
import { AuditLog } from "./entities/audit-log.entity";
import { SiteVisit } from "./entities/site-visit.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AuditSchedule, AuditLog, SiteVisit])],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService, AuditRepository],
})
export class AuditModule {}
