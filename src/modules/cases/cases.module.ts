import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CasesService } from "./cases.service";
import { CasesController } from "./cases.controller";
import { CasesRepository } from "./cases.repository";
import { Case } from "./entities/case.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Case])],
  controllers: [CasesController],
  providers: [CasesService, CasesRepository],
  exports: [CasesService, CasesRepository],
})
export class CasesModule {}
