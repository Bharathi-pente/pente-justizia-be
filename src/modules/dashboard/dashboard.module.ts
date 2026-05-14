import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { Case } from "../cases/entities/case.entity";
import { ComplianceIssue } from "../compliance/entities/compliance-issue.entity";
import { Funding } from "../funding/entities/funding.entity";
import { InsurancePolicy } from "../insurance/entities/insurance-policy.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Case, ComplianceIssue, Funding, InsurancePolicy]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
