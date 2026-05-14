import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { CellsService } from "./cells.service";
import { CreateCellDto } from "./dto/create-cell.dto";
import { UpdateCellDto } from "./dto/update-cell.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("cells")
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class CellsController {
  constructor(private readonly cellsService: CellsService) {}

  @Post()
  @Roles("hq_admin")
  async create(@Body() createCellDto: CreateCellDto) {
    const cell = await this.cellsService.create(createCellDto);
    return {
      success: true,
      data: cell,
    };
  }

  @Get()
  @Roles("hq_admin", "hq_compliance", "hq_bdm")
  async findAll() {
    const cells = await this.cellsService.findAll();
    return {
      success: true,
      data: cells,
      meta: {
        total: cells.length,
      },
    };
  }

  @Get(":id")
  @Roles("hq_admin", "hq_compliance", "hq_bdm", "cell_admin")
  async findOne(@Param("id") id: string) {
    const cell = await this.cellsService.findOne(id);
    return {
      success: true,
      data: cell,
    };
  }

  @Patch(":id")
  @Roles("hq_admin")
  async update(@Param("id") id: string, @Body() updateCellDto: UpdateCellDto) {
    const cell = await this.cellsService.update(id, updateCellDto);
    return {
      success: true,
      data: cell,
    };
  }

  @Delete(":id")
  @Roles("hq_admin")
  async remove(@Param("id") id: string) {
    await this.cellsService.remove(id);
    return {
      success: true,
      message: "Cell deleted successfully",
    };
  }
}
