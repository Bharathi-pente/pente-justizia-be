import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { FundingService } from "./funding.service";
import { FundingFilterDto } from "./dto/funding-filter.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CellScopeGuard } from "../../common/guards/cell-scope.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequestWithUser } from "../../common/types/request-with-user.types";

@Controller("funding")
@UseGuards(KeycloakAuthGuard, RolesGuard, CellScopeGuard)
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  /**
   * GET /funding
   * Get funding data (scoped to funder's cells or HQ admin)
   */
  @Get()
  @Roles("hq_admin", "hq_bdm", "funder")
  async findAll(
    @Query() filters: FundingFilterDto,
    @Request() req: RequestWithUser,
  ) {
    const cellIds = req.cell_ids;

    let funding;
    if (cellIds && cellIds[0] === "*") {
      // HQ roles - access all cells
      funding = await this.fundingService.findAll(filters);
    } else if (cellIds && cellIds.length > 0) {
      // Funder role - access funded cells only
      funding = await this.fundingService.findByCellIds(cellIds);
    } else {
      funding = [];
    }

    return {
      success: true,
      data: funding,
      meta: {
        total: funding.length,
      },
    };
  }

  /**
   * GET /funding/exposure
   * Get total exposure (drawdown amount)
   */
  @Get("exposure")
  @Roles("hq_admin", "hq_bdm", "funder")
  async getTotalExposure(@Request() req: RequestWithUser) {
    const cellIds = req.cell_ids;

    const exposure = await this.fundingService.calculateTotalExposure(
      cellIds && cellIds[0] !== "*" ? cellIds : undefined,
    );

    return {
      success: true,
      data: {
        total_exposure: exposure,
        currency: "GBP",
      },
    };
  }
}
