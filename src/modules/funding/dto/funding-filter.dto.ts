import { IsOptional, IsUUID, IsEnum } from "class-validator";
import { FundingStatus } from "../entities/funding.entity";

export class FundingFilterDto {
  @IsOptional()
  @IsUUID()
  cell_id?: string;

  @IsOptional()
  @IsEnum(FundingStatus)
  status?: FundingStatus;
}
