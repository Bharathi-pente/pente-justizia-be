import { IsOptional, IsUUID, IsEnum } from "class-validator";
import { PolicyStatus } from "../entities/insurance-policy.entity";

export class InsuranceFilterDto {
  @IsOptional()
  @IsUUID()
  cell_id?: string;

  @IsOptional()
  @IsUUID()
  case_id?: string;

  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;
}
