import { IsEmail, IsString, IsArray, IsOptional } from "class-validator";

export class UserProfileDto {
  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @IsOptional()
  @IsString()
  cell_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  funded_cell_ids?: string[];
}
