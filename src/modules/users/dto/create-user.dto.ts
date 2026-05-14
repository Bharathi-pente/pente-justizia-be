import {
  IsEmail,
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { UserRole } from "../entities/user.entity";

export class CreateUserDto {
  @IsString()
  keycloak_id: string;

  @IsEmail()
  email: string;

  @IsString()
  full_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsUUID()
  cell_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
