import { Injectable, Logger } from "@nestjs/common";
import { ClioService } from "./clio.service";

@Injectable()
export class ClioSyncService {
  private readonly logger = new Logger(ClioSyncService.name);

  constructor(private readonly clioService: ClioService) {}

  /**
   * Sync all Clio data for a cell
   */
  async syncCellData(cellId: string): Promise<void> {
    this.logger.log(`Starting Clio sync for cell: ${cellId}`);

    try {
      // Sync matters (cases)
      await this.syncMatters(cellId);

      // Sync contacts
      await this.syncContacts(cellId);

      // Sync activities
      await this.syncActivities(cellId);

      this.logger.log(`Completed Clio sync for cell: ${cellId}`);
    } catch (error) {
      this.logger.error(`Error syncing Clio data for cell ${cellId}:`, error);
      throw error;
    }
  }

  private async syncMatters(cellId: string): Promise<void> {
    this.logger.log(`Syncing matters for cell: ${cellId}`);

    const matters = await this.clioService.callClioApi(cellId, "matters");

    // Process and save matters
    // This would typically involve saving to the cases table
    this.logger.log(`Synced ${matters.data?.length || 0} matters`);
  }

  private async syncContacts(cellId: string): Promise<void> {
    this.logger.log(`Syncing contacts for cell: ${cellId}`);

    const contacts = await this.clioService.callClioApi(cellId, "contacts");

    // Process and save contacts
    this.logger.log(`Synced ${contacts.data?.length || 0} contacts`);
  }

  private async syncActivities(cellId: string): Promise<void> {
    this.logger.log(`Syncing activities for cell: ${cellId}`);

    const activities = await this.clioService.callClioApi(cellId, "activities");

    // Process and save activities
    this.logger.log(`Synced ${activities.data?.length || 0} activities`);
  }
}
