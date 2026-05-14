import { IsOptional, IsString, IsEnum, IsUUID } from "class-validator";
import { CaseStage, CaseStatus } from "../entities/case.entity";

export class CaseFilterDto {
  @IsOptional()
  @IsUUID()
  cell_id?: string;

  @IsOptional()
  @IsEnum(CaseStage)
  stage?: CaseStage;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsString()
  vertical?: string;

  @IsOptional()
  @IsString()
  client_name?: string;
}
