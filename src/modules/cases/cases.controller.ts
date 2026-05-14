import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CasesService } from "./cases.service";
import { CaseFilterDto } from "./dto/case-filter.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CellScopeGuard } from "../../common/guards/cell-scope.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequestWithUser } from "../../common/types/request-with-user.types";

@Controller("cases")
@UseGuards(KeycloakAuthGuard, RolesGuard, CellScopeGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  /**
   * GET /cases
   * Get all cases (cell-scoped based on user role)
   */
  @Get()
  @Roles(
    "hq_admin",
    "hq_compliance",
    "hq_bdm",
    "cell_admin",
    "cell_solicitor",
    "cell_paralegal",
    "funder",
  )
  async findAll(
    @Query() filters: CaseFilterDto,
    @Request() req: RequestWithUser,
  ) {
    // Cell scope guard has attached cell_ids to request
    const cellIds = req.cell_ids;

    let cases;
    if (cellIds && cellIds[0] === "*") {
      // HQ roles - access all cells
      cases = await this.casesService.findAll(filters);
    } else if (cellIds && cellIds.length > 0) {
      // Cell/Funder roles - access specific cells
      cases = await this.casesService.findByCellIds(cellIds);
    } else {
      cases = [];
    }

    return {
      success: true,
      data: cases,
      meta: {
        total: cases.length,
      },
    };
  }

  /**
   * GET /cases/:id
   * Get single case by ID
   */
  @Get(":id")
  @Roles(
    "hq_admin",
    "hq_compliance",
    "hq_bdm",
    "cell_admin",
    "cell_solicitor",
    "cell_paralegal",
    "funder",
  )
  async findOne(@Param("id") id: string) {
    const caseEntity = await this.casesService.findOne(id);
    return {
      success: true,
      data: caseEntity,
    };
  }
}
