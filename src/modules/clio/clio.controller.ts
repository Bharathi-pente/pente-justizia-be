import { Controller, Get, Query, Param, Post, UseGuards } from "@nestjs/common";
import { ClioService } from "./clio.service";
import { ClioSyncService } from "./clio-sync.service";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("clio")
export class ClioController {
  constructor(
    private readonly clioService: ClioService,
    private readonly clioSyncService: ClioSyncService,
  ) {}

  /**
   * GET /clio/oauth/authorize/:cellId
   * Generate OAuth URL for cell
   */
  @Get("oauth/authorize/:cellId")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin", "cell_admin")
  async getOAuthUrl(@Param("cellId") cellId: string) {
    const url = this.clioService.generateOAuthUrl(cellId);
    return {
      success: true,
      data: { url },
    };
  }

  /**
   * GET /clio/oauth/callback
   * Handle OAuth callback from Clio
   */
  @Get("oauth/callback")
  async handleOAuthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
  ) {
    const connection = await this.clioService.handleOAuthCallback(code, state);
    return {
      success: true,
      data: connection,
      message: "Clio connection established successfully",
    };
  }

  /**
   * POST /clio/sync/:cellId
   * Trigger manual sync for cell
   */
  @Post("sync/:cellId")
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles("hq_admin", "cell_admin")
  async syncCell(@Param("cellId") cellId: string) {
    await this.clioSyncService.syncCellData(cellId);
    return {
      success: true,
      message: "Clio sync initiated successfully",
    };
  }
}
