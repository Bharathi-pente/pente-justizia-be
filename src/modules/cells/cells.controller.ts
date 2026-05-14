// src/modules/cells/cells.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CellsService } from './cells.service';

@Controller('cells')
export class CellsController {
  private readonly logger = new Logger(CellsController.name);

  constructor(private readonly cellsService: CellsService) {}

  /**
   * POST /cells/onboard
   *
   * Creates or resumes a PENDING_CONNECTION cell.
   * Returns the OAuth URL — frontend should redirect immediately.
   *
   * Body: { "name": "Ashwini UK Cell" }
   */
  @Post('onboard')
  async onboard(@Body() body: { name: string }) {
    try {
      const result = await this.cellsService.onboardCell(body.name);
      return { success: true, data: result };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * GET /cells
   *
   * Returns all cells (for admin/HQ use).
   */
  @Get()
  async getAll() {
    try {
      const cells = await this.cellsService.findAll();
      return { success: true, data: cells };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /cells/:cellId
   */
  @Get(':cellId')
  async getOne(@Param('cellId') cellId: string) {
    try {
      const cell = await this.cellsService.findById(cellId);
      return { success: true, data: cell };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.NOT_FOUND);
    }
  }
}
