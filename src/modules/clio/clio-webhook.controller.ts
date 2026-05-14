import { Controller, Post, Param, Body, Logger } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";

@Controller("clio/webhook")
export class ClioWebhookController {
  private readonly logger = new Logger(ClioWebhookController.name);

  /**
   * POST /clio/webhook/:cellId
   * Receive webhook events from Clio
   */
  @Post(":cellId")
  @Public()
  async handleWebhook(@Param("cellId") cellId: string, @Body() payload: any) {
    this.logger.log(`Received Clio webhook for cell: ${cellId}`);
    this.logger.debug(`Webhook payload:`, payload);

    // Process webhook based on event type
    const eventType = payload.type || payload.event;

    switch (eventType) {
      case "matter.created":
      case "matter.updated":
        this.logger.log(`Matter event: ${eventType}`);
        // Trigger sync for this matter
        break;
      case "activity.created":
        this.logger.log(`Activity event: ${eventType}`);
        // Process activity
        break;
      default:
        this.logger.log(`Unknown event type: ${eventType}`);
    }

    return {
      success: true,
      message: "Webhook received",
    };
  }
}
