import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { InsuranceService } from "./insurance.service";
import { InsuranceFilterDto } from "./dto/insurance-filter.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CellScopeGuard } from "../../common/guards/cell-scope.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequestWithUser } from "../../common/types/request-with-user.types";

@Controller("insurance")
@UseGuards(KeycloakAuthGuard, RolesGuard, CellScopeGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /**
   * GET /insurance
   * Get insurance policies (insurer has access to all cells)
   */
  @Get()
  @Roles("hq_admin", "hq_bdm", "insurer")
  async findAll(
    @Query() filters: InsuranceFilterDto,
    @Request() req: RequestWithUser,
  ) {
    const policies = await this.insuranceService.findAll(filters);

    return {
      success: true,
      data: policies,
      meta: {
        total: policies.length,
      },
    };
  }

  /**
   * GET /insurance/exposure
   * Get total ATE exposure
   */
  @Get("exposure")
  @Roles("hq_admin", "hq_bdm", "insurer")
  async getTotalExposure(@Request() req: RequestWithUser) {
    const cellIds = req.cell_ids;

    const exposure =
      await this.insuranceService.calculateTotalExposure(cellIds);
    const premium = await this.insuranceService.calculateTotalPremium(cellIds);

    return {
      success: true,
      data: {
        total_exposure: exposure,
        total_premium: premium,
        currency: "GBP",
      },
    };
  }
}
