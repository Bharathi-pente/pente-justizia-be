import { IsEmail, IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: string;

  @IsOptional()
  @IsUUID()
  cellId?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
