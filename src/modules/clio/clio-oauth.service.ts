// // src/modules/clio/clio-oauth.service.ts

// import { Injectable, BadRequestException, Logger } from '@nestjs/common';
// import axios from 'axios';
// import { ClioTokenService } from './clio-token.service';
// import { CellStatus } from '../cells/enums/cell-status.enum';
// import type { ClioTokenResponse } from './clio.types';
// import { PrismaService } from 'src/prisma/prisma.service';

// export interface OAuthExchangeResult {
//   cellId: string;
//   tokenExpiresAt: Date;
// }

// @Injectable()
// export class ClioOAuthService {
//   private readonly logger = new Logger(ClioOAuthService.name);

//   private readonly BASE_URL = ClioTokenService.CLIO_BASE_URL;

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly tokenService: ClioTokenService,
//   ) {}

//   // ─── Auth URL ─────────────────────────────────────────────────────────────

//   /**
//    * Build the Clio OAuth authorization URL.
//    *
//    * cellId is passed as `state` so the callback can link
//    * the returned code to the correct Cell row.
//    *
//    * No region param — all accounts use app.clio.com.
//    */
//   buildAuthorizationUrl(cellId: string): string {
//     const clientId = this.tokenService.getClioClientId();
//     const redirectUri = process.env.CLIO_REDIRECT_URI;

//     if (!redirectUri) {
//       throw new BadRequestException(
//         'CLIO_REDIRECT_URI is not set in environment',
//       );
//     }

//     const url =
//       `${this.BASE_URL}/oauth/authorize` +
//       `?response_type=code` +
//       `&client_id=${clientId}` +
//       `&redirect_uri=${encodeURIComponent(redirectUri)}` +
//       `&state=${encodeURIComponent(cellId)}`;

//     this.logger.debug(
//       `[OAUTH] Auth URL built for cell ${cellId}: ${url.substring(0, 100)}...`,
//     );

//     return url;
//   }

//   // ─── Exchange ─────────────────────────────────────────────────────────────

//   /**
//    * Exchange the one-time OAuth code for access + refresh tokens.
//    *
//    * Steps:
//    *  1. Validate state (cellId) exists as a PENDING_CONNECTION cell
//    *  2. Exchange code with Clio
//    *  3. Encrypt and store tokens
//    *  4. Mark cell as CONNECTED
//    *
//    * Sync is NOT triggered here — that is the SyncService's responsibility.
//    * The controller kicks off sync asynchronously after this returns.
//    */
//   async exchangeCodeForTokens(
//     code: string,
//     cellId: string,
//   ): Promise<OAuthExchangeResult> {
//     if (!code) {
//       throw new BadRequestException('Authorization code is missing');
//     }
//     if (!cellId) {
//       throw new BadRequestException(
//         'cellId is missing from state — cannot complete OAuth',
//       );
//     }

//     this.logger.log(`[OAUTH] Exchanging code for tokens — cell: ${cellId}`);

//     // Verify the cell exists and is in a valid pre-connection state
//     const cell = await this.prisma.cell.findUnique({
//       where: { id: cellId },
//     });

//     if (!cell) {
//       throw new BadRequestException(
//         `No cell found with id ${cellId}. Run onboarding first.`,
//       );
//     }

//     if (
//       cell.status !== CellStatus.PENDING_CONNECTION &&
//       cell.status !== CellStatus.DISCONNECTED
//     ) {
//       this.logger.warn(
//         `[OAUTH] Cell ${cellId} is in status ${cell.status} — proceeding with re-auth`,
//       );
//     }

//     // Exchange code with Clio
//     const tokenData = await this.requestTokenFromClio(code);

//     // Encrypt and persist tokens
//     await this.tokenService.storeTokens(cellId, {
//       accessToken: tokenData.access_token,
//       refreshToken: tokenData.refresh_token,
//       expiresIn: tokenData.expires_in,
//       clioBaseUrl: this.BASE_URL,
//     });

//     // Mark cell as CONNECTED
//     await this.prisma.cell.update({
//       where: { id: cellId },
//       data: { status: CellStatus.CONNECTED },
//     });

//     this.logger.log(`[OAUTH] ✅ Cell ${cellId} connected`);

//     return {
//       cellId,
//       tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
//     };
//   }

//   // ─── Private ─────────────────────────────────────────────────────────────

//   private async requestTokenFromClio(code: string): Promise<ClioTokenResponse> {
//     const clientId = this.tokenService.getClioClientId();
//     const clientSecret = this.tokenService.getClioClientSecret();
//     const redirectUri = process.env.CLIO_REDIRECT_URI ?? '';

//     const params = new URLSearchParams();
//     params.append('grant_type', 'authorization_code');
//     params.append('code', code);
//     params.append('client_id', clientId);
//     params.append('client_secret', clientSecret);
//     params.append('redirect_uri', redirectUri);

//     try {
//       const response = await axios.post<ClioTokenResponse>(
//         `${this.BASE_URL}/oauth/token`,
//         params,
//         { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
//       );

//       this.logger.log(
//         `[OAUTH] ✅ Tokens received — expires_in: ${response.data.expires_in}s`,
//       );

//       return response.data;
//     } catch (error: unknown) {
//       const msg = axios.isAxiosError(error)
//         ? JSON.stringify(error.response?.data ?? error.message)
//         : String(error);

//       this.logger.error(`[OAUTH] ❌ Token exchange failed: ${msg}`);
//       throw new BadRequestException(`Clio token exchange failed: ${msg}`);
//     }
//   }
// }

// src/modules/clio/clio-oauth.service.ts

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import { ClioTokenService } from './clio-token.service';
import { CellStatus } from '../cells/enums/cell-status.enum';
import type { ClioTokenResponse } from './clio.types';
import { PrismaService } from 'src/prisma/prisma.service';

export interface OAuthExchangeResult {
  cellId: string;
  tokenExpiresAt: Date;
}

@Injectable()
export class ClioOAuthService {
  private readonly logger = new Logger(ClioOAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: ClioTokenService,
  ) {}

  // ─── Auth URL ─────────────────────────────────────────────────────────────

  /**
   * Builds the Clio OAuth authorization URL using the region
   * configured in CLIO_BASE_URL environment variable.
   *
   * cellId is passed as `state` so the callback can identify the cell.
   */
  buildAuthorizationUrl(cellId: string): string {
    const baseUrl = this.tokenService.getClioBaseUrl_fromEnv();
    const clientId = this.tokenService.getClioClientId();
    const redirectUri = process.env.CLIO_REDIRECT_URI;

    if (!redirectUri) {
      throw new BadRequestException(
        'CLIO_REDIRECT_URI is not set in environment',
      );
    }

    const url =
      `${baseUrl}/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(cellId)}`;

    // Log region so it's visible in logs without exposing credentials
    this.logger.log(
      `[OAUTH] Auth URL built — cell: ${cellId}, region: ${baseUrl}`,
    );

    return url;
  }

  // ─── Exchange ─────────────────────────────────────────────────────────────

  /**
   * Exchange the one-time OAuth code for access + refresh tokens.
   *
   * Uses CLIO_BASE_URL from env for the token exchange endpoint.
   * Stores that same base URL on the cell's token record so future
   * API calls and refreshes always hit the correct region.
   */
  async exchangeCodeForTokens(
    code: string,
    cellId: string,
  ): Promise<OAuthExchangeResult> {
    if (!code) throw new BadRequestException('Authorization code is missing');
    if (!cellId)
      throw new BadRequestException(
        'cellId missing from state — cannot complete OAuth',
      );

    // Resolve base URL once — used for both token exchange and storage
    const baseUrl = this.tokenService.getClioBaseUrl_fromEnv();

    this.logger.log(
      `[OAUTH] Exchanging code — cell: ${cellId}, region: ${baseUrl}`,
    );

    const cell = await this.prisma.cell.findUnique({ where: { id: cellId } });

    if (!cell) {
      throw new BadRequestException(
        `No cell found with id ${cellId}. Run onboarding first.`,
      );
    }

    if (
      cell.status !== CellStatus.PENDING_CONNECTION &&
      cell.status !== CellStatus.DISCONNECTED
    ) {
      this.logger.warn(
        `[OAUTH] Cell ${cellId} is in status ${cell.status} — proceeding with re-auth`,
      );
    }

    const tokenData = await this.requestTokenFromClio(code, baseUrl);

    // Store tokens — clioBaseUrl is persisted so refresh + API calls
    // always use the correct region for this cell going forward
    await this.tokenService.storeTokens(cellId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      clioBaseUrl: baseUrl,
    });

    await this.prisma.cell.update({
      where: { id: cellId },
      data: { status: CellStatus.CONNECTED },
    });

    this.logger.log(`[OAUTH] ✅ Cell ${cellId} connected — region: ${baseUrl}`);

    return {
      cellId,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async requestTokenFromClio(
    code: string,
    baseUrl: string,
  ): Promise<ClioTokenResponse> {
    const clientId = this.tokenService.getClioClientId();
    const clientSecret = this.tokenService.getClioClientSecret();
    const redirectUri = process.env.CLIO_REDIRECT_URI ?? '';

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);

    const tokenUrl = `${baseUrl}/oauth/token`;
    this.logger.log(`[OAUTH] Posting token exchange to: ${tokenUrl}`);

    try {
      const response = await axios.post<ClioTokenResponse>(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      this.logger.log(
        `[OAUTH] ✅ Tokens received — expires_in: ${response.data.expires_in}s`,
      );

      return response.data;
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? error.message)
        : String(error);

      this.logger.error(`[OAUTH] ❌ Token exchange failed: ${msg}`);
      throw new BadRequestException(`Clio token exchange failed: ${msg}`);
    }
  }
}
