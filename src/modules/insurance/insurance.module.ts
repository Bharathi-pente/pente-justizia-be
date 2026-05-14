import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InsuranceService } from "./insurance.service";
import { InsuranceController } from "./insurance.controller";
import { InsuranceRepository } from "./insurance.repository";
import { InsurancePolicy } from "./entities/insurance-policy.entity";

@Module({
  imports: [TypeOrmModule.forFeature([InsurancePolicy])],
  controllers: [InsuranceController],
  providers: [InsuranceService, InsuranceRepository],
  exports: [InsuranceService, InsuranceRepository],
})
export class InsuranceModule {}
