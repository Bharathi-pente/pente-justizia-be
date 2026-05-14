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
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("users")
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles("hq_admin")
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      success: true,
      data: user,
    };
  }

  @Get()
  @Roles("hq_admin", "hq_compliance", "hq_bdm")
  async findAll() {
    const users = await this.usersService.findAll();
    return {
      success: true,
      data: users,
      meta: {
        total: users.length,
      },
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
