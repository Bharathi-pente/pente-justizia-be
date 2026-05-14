import { IsString, IsEnum, IsOptional, IsBoolean } from "class-validator";
import { CellStatus, CellVertical } from "../entities/cell.entity";

export class CreateCellDto {
  @IsString()
  name: string;

  @IsEnum(CellVertical)
  vertical: CellVertical;

  @IsOptional()
  @IsEnum(CellStatus)
  status?: CellStatus;

  @IsOptional()
  @IsString()
  company_number?: string;

  @IsOptional()
  @IsString()
  clio_instance_id?: string;

  @IsOptional()
  @IsBoolean()
  is_funded?: boolean;
}
