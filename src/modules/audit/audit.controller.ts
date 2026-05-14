import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuditFilterDto } from "./dto/audit-filter.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("audit")
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit/schedules
   * Get audit schedules
   */
  @Get("schedules")
  @Roles("hq_admin", "hq_compliance", "cell_admin")
  async getSchedules(@Query() filters: AuditFilterDto) {
    const schedules = await this.auditService.getSchedules(filters);

    return {
      success: true,
      data: schedules,
      meta: {
        total: schedules.length,
      },
    };
  }

  /**
   * GET /audit/logs
   * Get audit logs (activity trail)
   */
  @Get("logs")
  @Roles("hq_admin", "hq_compliance")
  async getLogs(
    @Query("userId") userId?: string,
    @Query("limit") limit = 100,
    @Query("offset") offset = 0,
  ) {
    const logs = await this.auditService.getLogs(userId, limit, offset);

    return {
      success: true,
      data: logs,
      meta: {
        total: logs.length,
      },
    };
  }

  /**
   * GET /audit/site-visits/:cellId
   * Get site visit history for a cell
   */
  @Get("site-visits/:cellId")
  @Roles("hq_admin", "hq_compliance", "cell_admin")
  async getSiteVisits(@Param("cellId") cellId: string) {
    const visits = await this.auditService.getSiteVisits(cellId);

    return {
      success: true,
      data: visits,
      meta: {
        total: visits.length,
      },
    };
  }
}
