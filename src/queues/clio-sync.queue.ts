import { Queue } from "bullmq";

export const CLIO_SYNC_QUEUE = "clio-sync";

export const clioSyncQueue = new Queue(CLIO_SYNC_QUEUE, {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});
