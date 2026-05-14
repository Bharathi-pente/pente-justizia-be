import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClioService } from "./clio.service";
import { ClioSyncService } from "./clio-sync.service";
import { ClioController } from "./clio.controller";
import { ClioWebhookController } from "./clio-webhook.controller";
import { ClioConnection } from "./entities/clio-connection.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ClioConnection])],
  controllers: [ClioController, ClioWebhookController],
  providers: [ClioService, ClioSyncService],
  exports: [ClioService, ClioSyncService],
})
export class ClioModule {}
