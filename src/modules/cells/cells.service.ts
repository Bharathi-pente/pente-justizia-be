// src/modules/cells/cells.service.ts

import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClioOAuthService } from '../clio/clio-oauth.service';
import { CellStatus } from './enums/cell-status.enum';

export interface OnboardCellResult {
  cellId: string;
  name: string;
  status: CellStatus;
  authUrl: string;
  isResumed: boolean;
}

export interface CellSummary {
  id: string;
  name: string;
  status: CellStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CellsService {
  private readonly logger = new Logger(CellsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: ClioOAuthService,
  ) {}

  // ─── Onboarding ──────────────────────────────────────────────────────────

  /**
   * Start or resume cell onboarding.
   *
   * If a PENDING_CONNECTION cell already exists with this name,
   * reuse it rather than creating a duplicate.
   *
   * Returns an authUrl the frontend should immediately redirect to.
   */
  async onboardCell(name: string): Promise<OnboardCellResult> {
    const trimmedName = name?.trim();

    if (!trimmedName) {
      throw new BadRequestException('Cell name is required');
    }

    // Check for an existing pending cell with the same name
    const existing = await this.prisma.cell.findFirst({
      where: {
        name: trimmedName,
        status: CellStatus.PENDING_CONNECTION,
      },
    });

    let cellId: string;
    let isResumed: boolean;

    if (existing) {
      this.logger.log(
        `[CELLS] ♻️ Resuming pending cell "${trimmedName}": ${existing.id}`,
      );
      cellId = existing.id;
      isResumed = true;
    } else {
      const created = await this.prisma.cell.create({
        data: {
          name: trimmedName,
          status: CellStatus.PENDING_CONNECTION,
        },
      });
      this.logger.log(
        `[CELLS] ✅ Created new cell "${trimmedName}": ${created.id}`,
      );
      cellId = created.id;
      isResumed = false;
    }

    const authUrl = this.oauthService.buildAuthorizationUrl(cellId);

    return {
      cellId,
      name: trimmedName,
      status: CellStatus.PENDING_CONNECTION,
      authUrl,
      isResumed,
    };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async findById(cellId: string): Promise<CellSummary> {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new NotFoundException(`Cell ${cellId} not found`);
    }

    return {
      id: cell.id,
      name: cell.name,
      status: cell.status as CellStatus,
      createdAt: cell.createdAt,
      updatedAt: cell.updatedAt,
    };
  }

  async findAllConnected(): Promise<CellSummary[]> {
    const cells = await this.prisma.cell.findMany({
      where: { status: CellStatus.CONNECTED },
      orderBy: { createdAt: 'asc' },
    });

    return cells.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status as CellStatus,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async findAll(): Promise<CellSummary[]> {
    const cells = await this.prisma.cell.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return cells.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status as CellStatus,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  // ─── Status Updates ──────────────────────────────────────────────────────

  async updateStatus(cellId: string, status: CellStatus): Promise<void> {
    await this.prisma.cell.update({
      where: { id: cellId },
      data: { status },
    });
  }
}
