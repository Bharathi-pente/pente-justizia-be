import { Worker, Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { CLIO_SYNC_QUEUE } from "../clio-sync.queue";

const logger = new Logger("ClioSyncProcessor");

/**
 * BullMQ Worker for processing Clio sync jobs
 */
export const clioSyncWorker = new Worker(
  CLIO_SYNC_QUEUE,
  async (job: Job) => {
    logger.log(
      `Processing Clio sync job ${job.id} for cell: ${job.data.cellId}`,
    );

    try {
      const { cellId } = job.data;

      // Here you would inject ClioSyncService and call syncCellData
      // For now, just simulate the work
      await new Promise((resolve) => setTimeout(resolve, 2000));

      logger.log(`Completed Clio sync job ${job.id} for cell: ${cellId}`);

      return { success: true, cellId };
    } catch (error) {
      logger.error(`Error processing Clio sync job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
  },
);

// Event listeners
clioSyncWorker.on("completed", (job) => {
  logger.log(`Job ${job.id} completed successfully`);
});

clioSyncWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed with error:`, err);
});

clioSyncWorker.on("error", (err) => {
  logger.error("Worker error:", err);
});
