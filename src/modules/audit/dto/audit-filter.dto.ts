import { IsOptional, IsUUID, IsEnum } from "class-validator";
import { AuditStatus } from "../entities/audit-schedule.entity";

export class AuditFilterDto {
  @IsOptional()
  @IsUUID()
  cell_id?: string;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;
}
