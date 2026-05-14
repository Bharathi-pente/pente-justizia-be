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
  ) {
    const users = await this.usersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      role,
      cellId,
    });
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
}