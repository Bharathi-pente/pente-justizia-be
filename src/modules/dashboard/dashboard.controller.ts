import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CellScopeGuard } from "../../common/guards/cell-scope.guard";
import { RequestWithUser } from "../../common/types/request-with-user.types";

@Controller("dashboard")
@UseGuards(KeycloakAuthGuard, RolesGuard, CellScopeGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard
   * Get role-specific dashboard data
   */
  @Get()
  async getDashboard(@Request() req: RequestWithUser) {
    const userRole = req.user.realm_access?.roles[0];
    let data;

    switch (userRole) {
      case "hq_admin":
        data = await this.dashboardService.getHqAdminDashboard();
        break;
      case "hq_compliance":
        data = await this.dashboardService.getHqComplianceDashboard();
        break;
      case "hq_bdm":
        data = await this.dashboardService.getHqBdmDashboard();
        break;
      case "cell_admin":
      case "cell_solicitor":
      case "cell_paralegal":
        const cellId = req.user.cell_id;
        if (!cellId) {
          return {
            success: false,
            message: "Cell ID not found for user",
          };
        }
        data = await this.dashboardService.getCellAdminDashboard(cellId);
        break;
      case "funder":
        const fundedCellIds = req.user.funded_cell_ids || [];
        data = await this.dashboardService.getFunderDashboard(fundedCellIds);
        break;
      case "insurer":
        data = await this.dashboardService.getInsurerDashboard();
        break;
      default:
        data = {};
    }

    return {
      success: true,
      data,
      role: userRole,
    };
  }
}
