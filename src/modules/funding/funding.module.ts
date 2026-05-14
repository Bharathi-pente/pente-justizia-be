import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FundingService } from "./funding.service";
import { FundingController } from "./funding.controller";
import { FundingRepository } from "./funding.repository";
import { Funding } from "./entities/funding.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Funding])],
  controllers: [FundingController],
  providers: [FundingService, FundingRepository],
  exports: [FundingService, FundingRepository],
})
export class FundingModule {}
