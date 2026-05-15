import { IsEmail, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: string;

  @IsOptional()
  @IsUUID()
  cellId?: string;
}
