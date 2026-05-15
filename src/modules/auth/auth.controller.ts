import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegistrationService } from "./registration.service";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequestWithUser } from "../../common/types/request-with-user.types";
import { UserProfileDto } from "./dto/user-profile.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { PublicSignupDto } from "./dto/public-signup.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
  ) {}

  /**
   * GET /auth/me
   * Returns current user profile from JWT token
   */
  @Get("me")
  @UseGuards(KeycloakAuthGuard)
  async getProfile(@Request() req: RequestWithUser): Promise<{
    success: boolean;
    data: UserProfileDto;
  }> {
    // Sync user to database
    await this.authService.syncUserFromToken(req.user);

    // Return user profile
    const profile = this.authService.getUserProfile(req.user);

    return {
      success: true,
      data: profile,
    };
  }

  /**
   * POST /auth/register/admin
   * Create HQ user (admin-only)
   */
  @Post("register/admin")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async createHQUser(@Body() dto: RegisterUserDto, @Request() req: RequestWithUser) {
    return this.registrationService.createUserByAdmin(req.user.sub, dto);
  }

  /**
   * POST /auth/invitations
   * Create invitation for cell user (cell admin only)
   */
  @Post("invitations")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin", "cell_admin")
  async createInvitation(@Body() dto: CreateInvitationDto, @Request() req: RequestWithUser) {
    return this.registrationService.createInvitation(req.user.sub, dto);
  }

  /**
   * GET /auth/invitations/:token
   * Validate invitation token
   */
  @Get("invitations/:token")
  @Public()
  async getInvitation(@Param("token") token: string) {
    return this.registrationService.getInvitationByToken(token);
  }

  /**
   * POST /auth/invitations/accept
   * Accept invitation and create account
   */
  @Post("invitations/accept")
  @Public()
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.registrationService.acceptInvitation(dto);
  }

  /**
   * POST /auth/signup
   * Public signup for funders/insurers
   */
  @Post("signup")
  @Public()
  async publicSignup(@Body() dto: PublicSignupDto) {
    return this.registrationService.publicSignup(dto);
  }

  /**
   * GET /auth/stats
   * Get user statistics (HQ admin only)
   */
  @Get("stats")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async getUserStats() {
    const totalUsers = await this.registrationService.getTotalUsers();
    const hqUsers = await this.registrationService.getUsersByRolePrefix('hq_');
    const cellUsers = await this.registrationService.getUsersByRolePrefix('cell_');
    const pendingUsers = await this.registrationService.getPendingUsersCount();

    return {
      totalUsers,
      hqUsers,
      cellUsers,
      pendingUsers,
    };
  }

  /**
   * GET /auth/users
   * Get all users (HQ admin only)
   */
  @Get("users")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async getAllUsers() {
    return this.registrationService.getAllUsers();
  }

  /**
   * GET /auth/pending-users
   * List pending user approvals (HQ admin only)
   */
  @Get("pending-users")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async getPendingUsers() {
    return this.registrationService.getPendingUsers();
  }

  /**
   * PUT /auth/pending-users/:id/approve
   * Approve pending user (HQ admin only)
   */
  @Put("pending-users/:id/approve")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async approvePendingUser(
    @Param("id") id: string,
    @Body() body: { fundedCellIds?: string[] },
    @Request() req: RequestWithUser,
  ) {
    return this.registrationService.approvePendingUser(req.user.sub, id, body.fundedCellIds);
  }

  /**
   * PUT /auth/pending-users/:id/reject
   * Reject pending user (HQ admin only)
   */
  @Put("pending-users/:id/reject")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async rejectPendingUser(
    @Param("id") id: string,
    @Body() body: { reason: string },
    @Request() req: RequestWithUser,
  ) {
    return this.registrationService.rejectPendingUser(req.user.sub, id, body.reason);
  }

  /**
   * PUT /auth/users/:id
   * Update user (HQ admin only)
   */
  @Put("users/:id")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.registrationService.updateUser(id, dto);
  }

  /**
   * DELETE /auth/users/:id
   * Delete user (HQ admin only)
   */
  @Delete("users/:id")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin")
  async deleteUser(@Param("id") id: string) {
    return this.registrationService.deleteUser(id);
  }
}
