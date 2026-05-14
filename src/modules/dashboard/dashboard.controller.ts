// src/modules/dashboard/dashboard.controller.ts

import {
  Controller,
  Get,
  Post,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  // ── GET /hq/overview ───────────────────────────────────────────────────────
  /**
   * Platform-wide aggregated metrics for HQ dashboards.
   * Covers all connected cells — pure DB aggregation.
   */
  @Get('hq/overview')
  async getHqOverview() {
    try {
      const data = await this.dashboardService.getHqOverview();
      return { success: true, data };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[HQ] Overview failed: ${msg}`);
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── GET /cells/:cellId/dashboard ───────────────────────────────────────────
  /**
   * Aggregated metrics for a single cell's operational dashboard.
   * Returns only that cell's data — strict cell isolation.
   */
  @Get('cells/:cellId/dashboard')
  async getCellDashboard(@Param('cellId') cellId: string) {
    try {
      const data = await this.dashboardService.getCellDashboard(cellId);
      return { success: true, data };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[DASHBOARD] Cell ${cellId} failed: ${msg}`);
      throw new HttpException(
        msg,
        msg.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cells/:cellId/tasks')
  async getTasksByCellId(@Param('cellId') cellId: string) {
    try {
      const data = await this.dashboardService.getTaskbycellId(cellId);
      return { success: true, data };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[DASHBOARD] Cell ${cellId} tasks failed: ${msg}`);
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── POST /cells/:cellId/sync ────────────────────────────────────────────────
  /**
   * Trigger a full background sync for a cell.
   * Returns immediately — sync runs async.
   */
  @Post('cells/:cellId/sync')
  async triggerSync(@Param('cellId') cellId: string) {
    try {
      const result = await this.dashboardService.triggerSync(cellId);
      return {
        success: true,
        message: 'Sync queued — dashboard will update when complete',
        data: result,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  // ── POST /cells/:cellId/sync/:entity ────────────────────────────────────────
  /**
   * Trigger a targeted sync for a specific entity type.
   * Useful for manual re-syncing after Clio data changes.
   */
  @Post('cells/:cellId/sync/:entity')
  async triggerEntitySync(
    @Param('cellId') cellId: string,
    @Param('entity') entity: string,
  ) {
    const validEntities = [
      'matters',
      'contacts',
      'bills',
      'tasks',
      'documents',
      'activities',
    ] as const;

    type ValidEntity = (typeof validEntities)[number];

    if (!validEntities.includes(entity as ValidEntity)) {
      throw new HttpException(
        `Invalid entity "${entity}". Valid values: ${validEntities.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.dashboardService.triggerEntitySync(
        cellId,
        entity as ValidEntity,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  // ── GET /cells/:cellId/sync-status ─────────────────────────────────────────
  /**
   * Returns the latest sync log entry per entity for a cell.
   * Lets the frontend poll for sync completion.
   */
  @Get('cells/:cellId/sync-status')
  async getSyncStatus(@Param('cellId') cellId: string) {
    try {
      const data = await this.dashboardService.getCellDashboard(cellId);
      return {
        success: true,
        data: {
          cellId,
          status: data.status,
          sync: data.sync,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }
}
