import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  Param,
} from "@nestjs/common";
import { ComplianceService } from "./compliance.service";
import { ComplianceFilterDto } from "./dto/compliance-filter.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CellScopeGuard } from "../../common/guards/cell-scope.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequestWithUser } from "../../common/types/request-with-user.types";

@Controller("compliance")
@UseGuards(KeycloakAuthGuard, RolesGuard, CellScopeGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  /**
   * GET /compliance/checklists
   * Get SRA compliance checklists
   */
  @Get("checklists")
  @Roles("hq_admin", "hq_compliance", "cell_admin")
  async getChecklists(
    @Query() filters: ComplianceFilterDto,
    @Request() req: RequestWithUser,
  ) {
    const checklists = await this.complianceService.getChecklists(filters);

    return {
      success: true,
      data: checklists,
      meta: {
        total: checklists.length,
      },
    };
  }

  /**
   * GET /compliance/issues
   * Get open compliance issues
   */
  @Get("issues")
  @Roles("hq_admin", "hq_compliance", "cell_admin")
  async getIssues(
    @Query() filters: ComplianceFilterDto,
    @Request() req: RequestWithUser,
  ) {
    const issues = await this.complianceService.getIssues(filters);

    return {
      success: true,
      data: issues,
      meta: {
        total: issues.length,
      },
    };
  }

  /**
   * GET /compliance/score/:cellId
   * Get compliance score for a cell
   */
  @Get("score/:cellId")
  @Roles("hq_admin", "hq_compliance", "cell_admin")
  async getComplianceScore(@Param("cellId") cellId: string) {
    const score = await this.complianceService.calculateComplianceScore(cellId);

    return {
      success: true,
      data: { score, cellId },
    };
  }
}
