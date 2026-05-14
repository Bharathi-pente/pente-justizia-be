import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue({
      name: "clio-sync",
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
