import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RequestWithUser } from "../../common/types/request-with-user.types";
import { UserProfileDto } from "./dto/user-profile.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
