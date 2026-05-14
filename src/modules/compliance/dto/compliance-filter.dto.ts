import { IsOptional, IsEnum, IsUUID } from "class-validator";
import {
  ComplianceCategory,
  ComplianceStatus,
} from "../entities/compliance-checklist.entity";
import {
  IssueSeverity,
  IssueStatus,
} from "../entities/compliance-issue.entity";

export class ComplianceFilterDto {
  @IsOptional()
  @IsUUID()
  cell_id?: string;

  @IsOptional()
  @IsEnum(ComplianceCategory)
  category?: ComplianceCategory;

  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @IsOptional()
  @IsEnum(IssueStatus)
  issue_status?: IssueStatus;
}
