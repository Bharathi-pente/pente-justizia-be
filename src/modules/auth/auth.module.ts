import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RegistrationService } from "./registration.service";
import { KeycloakAdminService } from "./keycloak-admin.service";
import { PrismaModule } from "../../database/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, RegistrationService, KeycloakAdminService],
  exports: [AuthService, RegistrationService, KeycloakAdminService],
})
export class AuthModule {}
