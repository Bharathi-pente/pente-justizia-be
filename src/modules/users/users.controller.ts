import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequestWithUser } from "../../common/types/request-with-user.types";
import { UserRole } from "./entities/user.entity";

@Controller("users")
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles("hq_admin")
  async create(@Body() createUserDto: CreateUserDto, @Req() req: RequestWithUser) {
    const createdByKeycloakId = req.user.sub;
    const user = await this.usersService.create(createUserDto, createdByKeycloakId);
    return {
      success: true,
      data: user,
    };
  }

  @Get()
  @Roles("hq_admin", "hq_compliance", "hq_bdm")
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("cellId") cellId?: string,
    @Req() req?: RequestWithUser,
  ) {
    // Extract user context from JWT
    const userContext = req ? {
      keycloakId: req.user.sub,
      role: this.extractRole(req.user.realm_access?.roles || []),
    } : undefined;

    const users = await this.usersService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        search,
        role,
        cellId,
      },
      userContext,
    );
    return {
      success: true,
      ...users,
    };
  }

  @Get(":id")
  @Roles("hq_admin", "hq_compliance", "hq_bdm")
  async findOne(@Param("id") id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }

  @Patch(":id")
  @Roles("hq_admin")
  async update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      success: true,
      data: user,
    };
  }

  @Delete(":id")
  @Roles("hq_admin")
  async remove(@Param("id") id: string) {
    await this.usersService.remove(id);
    return {
      success: true,
      message: "User deleted successfully",
    };
  }

  private extractRole(roles: string[]): UserRole {
    // Priority: hq_admin > hq_compliance > hq_bdm > others
    if (roles.includes(UserRole.HQ_ADMIN)) return UserRole.HQ_ADMIN;
    if (roles.includes(UserRole.HQ_COMPLIANCE)) return UserRole.HQ_COMPLIANCE;
    if (roles.includes(UserRole.HQ_BDM)) return UserRole.HQ_BDM;
    if (roles.includes(UserRole.CELL_ADMIN)) return UserRole.CELL_ADMIN;
    if (roles.includes(UserRole.CELL_SOLICITOR)) return UserRole.CELL_SOLICITOR;
    if (roles.includes(UserRole.CELL_PARALEGAL)) return UserRole.CELL_PARALEGAL;
    if (roles.includes(UserRole.FUNDER)) return UserRole.FUNDER;
    if (roles.includes(UserRole.INSURER)) return UserRole.INSURER;
    return UserRole.CELL_PARALEGAL; // default fallback
  }
}