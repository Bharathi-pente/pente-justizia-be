import {
  IsEmail,
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
} from "class-validator";
import { UserRole, ConsentStatus, OnboardingStatus, ClientType } from "../entities/user.entity";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  full_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsUUID()
  cell_id?: string;

  // Client / Contact Variables
  @IsOptional()
  @IsString()
  client_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(ConsentStatus)
  consent_status?: ConsentStatus;

  @IsOptional()
  @IsBoolean()
  gdpr_status?: boolean;

  @IsOptional()
  @IsBoolean()
  verification_status?: boolean;

  @IsOptional()
  @IsEnum(OnboardingStatus)
  onboarding_status?: OnboardingStatus;

  @IsOptional()
  @IsInt()
  linked_case_count?: number;

  @IsOptional()
  @IsEnum(ClientType)
  client_type?: ClientType;

  @IsOptional()
  @IsBoolean()
  vulnerability_flag?: boolean;

  @IsOptional()
  @IsString()
  preferred_contact_method?: string;
}