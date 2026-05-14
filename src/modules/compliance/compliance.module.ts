import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplianceService } from "./compliance.service";
import { ComplianceController } from "./compliance.controller";
import { ComplianceRepository } from "./compliance.repository";
import { ComplianceChecklist } from "./entities/compliance-checklist.entity";
import { ComplianceIssue } from "./entities/compliance-issue.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplianceChecklist, ComplianceIssue])],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceRepository],
  exports: [ComplianceService, ComplianceRepository],
})
export class ComplianceModule {}
