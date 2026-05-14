// // src/modules/clio/clio-token.service.ts

// import {
//   Injectable,
//   BadRequestException,
//   Logger,
//   UnauthorizedException,
// } from '@nestjs/common';
// import axios from 'axios';
// import { TokenEncryptionService } from './security/token-encryption.service';
// import { CellStatus } from '../cells/enums/cell-status.enum';
// import type { ClioTokenResponse } from './clio.types';
// import { PrismaService } from 'src/prisma/prisma.service';

// export interface StoredTokenPayload {
//   accessToken: string;
//   refreshToken: string;
//   expiresIn: number;
//   clioBaseUrl: string;
// }

// @Injectable()
// export class ClioTokenService {
//   private readonly logger = new Logger(ClioTokenService.name);

//   // Single fixed Clio base URL — region logic removed
//   // static readonly CLIO_BASE_URL = 'https://app.clio.com';
//   static readonly CLIO_BASE_URL = 'https://eu.app.clio.com';

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly encryption: TokenEncryptionService,
//   ) {}

//   // ─── Store ───────────────────────────────────────────────────────────────

//   /**
//    * Encrypt and upsert token record for a cell.
//    * Called after OAuth exchange and after token refresh.
//    */
//   async storeTokens(
//     cellId: string,
//     payload: StoredTokenPayload,
//   ): Promise<void> {
//     this.logger.log(`[TOKEN] Storing encrypted tokens for cell: ${cellId}`);

//     const expiresAt = new Date(Date.now() + payload.expiresIn * 1000);
//     const encryptedAccessToken = this.encryption.encryptToken(
//       payload.accessToken,
//     );
//     const encryptedRefreshToken = this.encryption.encryptToken(
//       payload.refreshToken,
//     );

//     await this.prisma.cellToken.upsert({
//       where: { cellId },
//       update: {
//         encryptedAccessToken,
//         encryptedRefreshToken,
//         expiresAt,
//         clioBaseUrl: payload.clioBaseUrl,
//       },
//       create: {
//         cellId,
//         encryptedAccessToken,
//         encryptedRefreshToken,
//         expiresAt,
//         clioBaseUrl: payload.clioBaseUrl,
//       },
//     });

//     this.logger.log(`[TOKEN] ✅ Stored — expires: ${expiresAt.toISOString()}`);
//   }

//   // ─── Retrieve ────────────────────────────────────────────────────────────

//   /**
//    * Returns a valid decrypted access token for a cell.
//    * Auto-refreshes if the token is within 5 minutes of expiry.
//    *
//    * This is the ONLY method sync services should call to get a token.
//    * Tokens are never exposed outside of this service's return values.
//    */
//   async getValidAccessToken(cellId: string): Promise<string> {
//     const record = await this.prisma.cellToken.findUnique({
//       where: { cellId },
//     });

//     if (!record) {
//       throw new UnauthorizedException(
//         `Cell ${cellId} has no Clio connection. Complete OAuth first.`,
//       );
//     }

//     const fiveMinutes = 5 * 60 * 1000;
//     const isExpiringSoon =
//       record.expiresAt.getTime() < Date.now() + fiveMinutes;

//     if (!isExpiringSoon) {
//       return this.encryption.decryptToken(record.encryptedAccessToken);
//     }

//     this.logger.warn(`[TOKEN] ⚠️ Token expiring soon — refreshing: ${cellId}`);
//     return this.refreshToken(cellId, record);
//   }

//   /**
//    * Returns the stored Clio base URL for a cell.
//    * Used by sync services before making Clio API calls.
//    */
//   // async getClioBaseUrl(cellId: string): Promise<string> {
//   //   const record = await this.prisma.cellToken.findUnique({
//   //     where: { cellId },
//   //     select: { clioBaseUrl: true },
//   //   });

//   //   if (!record) {
//   //     throw new BadRequestException(
//   //       `No token record found for cell ${cellId}. Connect to Clio first.`,
//   //     );
//   //   }

//   //   return record.clioBaseUrl;
//   // }

//   /**
//    * Returns the Clio base URL stored for this cell at token-exchange time.
//    * This is the source of truth for which region this cell belongs to.
//    */
//   async getClioBaseUrl(cellId: string): Promise<string> {
//     const record = await this.prisma.cellToken.findUnique({
//       where: { cellId },
//       select: { clioBaseUrl: true },
//     });

//     if (!record) {
//       throw new BadRequestException(
//         `No token record found for cell ${cellId}. Connect to Clio first.`,
//       );
//     }

//     return record.clioBaseUrl;
//   }

//   // ─── Status ──────────────────────────────────────────────────────────────

//   async getTokenStatus(cellId: string) {
//     const record = await this.prisma.cellToken.findUnique({
//       where: { cellId },
//       select: { expiresAt: true, updatedAt: true, clioBaseUrl: true },
//     });

//     if (!record) {
//       return { connected: false, message: 'No Clio connection found' };
//     }

//     return {
//       connected: true,
//       cellId,
//       expiresAt: record.expiresAt,
//       isExpired: record.expiresAt.getTime() < Date.now(),
//       lastUpdated: record.updatedAt,
//       clioBaseUrl: record.clioBaseUrl,
//       // Tokens are never returned — not even masked — use getValidAccessToken()
//     };
//   }

//   // ─── Refresh ─────────────────────────────────────────────────────────────

//   private async refreshToken(
//     cellId: string,
//     record: { encryptedRefreshToken: string; clioBaseUrl: string },
//   ): Promise<string> {
//     this.logger.log(`[TOKEN] Refreshing via ${record.clioBaseUrl}`);

//     const refreshToken = this.encryption.decryptToken(
//       record.encryptedRefreshToken,
//     );

//     const clientId = this.getClioClientId();
//     const clientSecret = this.getClioClientSecret();

//     try {
//       const params = new URLSearchParams();
//       params.append('grant_type', 'refresh_token');
//       params.append('refresh_token', refreshToken);
//       params.append('client_id', clientId);
//       params.append('client_secret', clientSecret);

//       const response = await axios.post<ClioTokenResponse>(
//         `${record.clioBaseUrl}/oauth/token`,
//         params,
//         { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
//       );

//       const newTokens = response.data;
//       this.logger.log(
//         `[TOKEN] ✅ Refresh success — expires_in: ${newTokens.expires_in}s`,
//       );

//       await this.storeTokens(cellId, {
//         accessToken: newTokens.access_token,
//         refreshToken: newTokens.refresh_token,
//         expiresIn: newTokens.expires_in,
//         clioBaseUrl: record.clioBaseUrl,
//       });

//       return newTokens.access_token;
//     } catch (error: unknown) {
//       const msg = this.extractMessage(error);
//       this.logger.error(`[TOKEN] ❌ Refresh failed: ${msg}`);

//       // Mark the cell as disconnected so UI shows reconnect prompt
//       await this.prisma.cell.update({
//         where: { id: cellId },
//         data: { status: CellStatus.DISCONNECTED },
//       });

//       throw new UnauthorizedException(
//         'Clio session expired. Please reconnect your cell to Clio.',
//       );
//     }
//   }

//   // ─── Credentials ─────────────────────────────────────────────────────────

//   /**
//    * Single credential set — region logic removed.
//    * All accounts are UK/EU Clio, pointing to app.clio.com.
//    */
//   getClioClientId(): string {
//     const clientId = process.env.CLIO_CLIENT_ID;
//     if (!clientId) {
//       throw new BadRequestException('CLIO_CLIENT_ID is not set in environment');
//     }
//     return clientId;
//   }

//   getClioClientSecret(): string {
//     const clientSecret = process.env.CLIO_CLIENT_SECRET;
//     if (!clientSecret) {
//       throw new BadRequestException(
//         'CLIO_CLIENT_SECRET is not set in environment',
//       );
//     }
//     return clientSecret;
//   }

//   // ─── Utils ───────────────────────────────────────────────────────────────

//   private extractMessage(error: unknown): string {
//     if (axios.isAxiosError(error)) {
//       return JSON.stringify(error.response?.data ?? error.message);
//     }
//     return error instanceof Error ? error.message : String(error);
//   }
// }

// src/modules/clio/clio-token.service.ts

import {
  Injectable,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { TokenEncryptionService } from './security/token-encryption.service';
import { CellStatus } from '../cells/enums/cell-status.enum';
import type { ClioTokenResponse } from './clio.types';
import { PrismaService } from 'src/prisma/prisma.service';

export interface StoredTokenPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  clioBaseUrl: string;
}

@Injectable()
export class ClioTokenService {
  private readonly logger = new Logger(ClioTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: TokenEncryptionService,
  ) {}

  // ─── Base URL ─────────────────────────────────────────────────────────────

  /**
   * Returns the Clio base URL from environment.
   * Defaults to EU if not set — change CLIO_BASE_URL in .env to switch regions.
   *
   * US accounts:  https://app.clio.com
   * EU/UK accounts: https://eu.app.clio.com
   */
  getClioBaseUrl_fromEnv(): string {
    const baseUrl = process.env.CLIO_BASE_URL;
    if (!baseUrl) {
      throw new BadRequestException(
        'CLIO_BASE_URL is not set in environment. ' +
          'Set it to https://app.clio.com (US) or https://eu.app.clio.com (EU/UK).',
      );
    }

    // Strip trailing slash to prevent double-slash in URL construction
    return baseUrl.replace(/\/$/, '');
  }

  // ─── Store ────────────────────────────────────────────────────────────────

  async storeTokens(
    cellId: string,
    payload: StoredTokenPayload,
  ): Promise<void> {
    this.logger.log(`[TOKEN] Storing encrypted tokens for cell: ${cellId}`);
    this.logger.log(`[TOKEN] Region base URL: ${payload.clioBaseUrl}`);

    const expiresAt = new Date(Date.now() + payload.expiresIn * 1000);
    const encryptedAccessToken = this.encryption.encryptToken(
      payload.accessToken,
    );
    const encryptedRefreshToken = this.encryption.encryptToken(
      payload.refreshToken,
    );

    await this.prisma.cellToken.upsert({
      where: { cellId },
      update: {
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt,
        clioBaseUrl: payload.clioBaseUrl,
      },
      create: {
        cellId,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt,
        clioBaseUrl: payload.clioBaseUrl,
      },
    });

    this.logger.log(`[TOKEN] ✅ Stored — expires: ${expiresAt.toISOString()}`);
  }

  // ─── Retrieve ─────────────────────────────────────────────────────────────

  async getValidAccessToken(cellId: string): Promise<string> {
    const record = await this.prisma.cellToken.findUnique({
      where: { cellId },
    });

    if (!record) {
      throw new UnauthorizedException(
        `Cell ${cellId} has no Clio connection. Complete OAuth first.`,
      );
    }

    const fiveMinutes = 5 * 60 * 1000;
    const isExpiringSoon =
      record.expiresAt.getTime() < Date.now() + fiveMinutes;

    if (!isExpiringSoon) {
      return this.encryption.decryptToken(record.encryptedAccessToken);
    }

    this.logger.warn(`[TOKEN] ⚠️ Token expiring soon — refreshing: ${cellId}`);
    return this.refreshToken(cellId, record);
  }

  /**
   * Returns the Clio base URL stored for this cell at token-exchange time.
   * This is the source of truth for which region this cell belongs to.
   */
  async getClioBaseUrl(cellId: string): Promise<string> {
    const record = await this.prisma.cellToken.findUnique({
      where: { cellId },
      select: { clioBaseUrl: true },
    });

    if (!record) {
      throw new BadRequestException(
        `No token record found for cell ${cellId}. Connect to Clio first.`,
      );
    }

    return record.clioBaseUrl;
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async getTokenStatus(cellId: string) {
    const record = await this.prisma.cellToken.findUnique({
      where: { cellId },
      select: { expiresAt: true, updatedAt: true, clioBaseUrl: true },
    });

    if (!record) {
      return { connected: false, message: 'No Clio connection found' };
    }

    return {
      connected: true,
      cellId,
      expiresAt: record.expiresAt,
      isExpired: record.expiresAt.getTime() < Date.now(),
      lastUpdated: record.updatedAt,
      clioBaseUrl: record.clioBaseUrl,
    };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  private async refreshToken(
    cellId: string,
    record: { encryptedRefreshToken: string; clioBaseUrl: string },
  ): Promise<string> {
    // Use the base URL stored at connection time — not the env var
    // This ensures the refresh hits the same region the cell connected to
    this.logger.log(`[TOKEN] Refreshing via ${record.clioBaseUrl}`);

    const refreshToken = this.encryption.decryptToken(
      record.encryptedRefreshToken,
    );
    const clientId = this.getClioClientId();
    const clientSecret = this.getClioClientSecret();

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);

      const response = await axios.post<ClioTokenResponse>(
        `${record.clioBaseUrl}/oauth/token`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const newTokens = response.data;
      this.logger.log(
        `[TOKEN] ✅ Refresh success — expires_in: ${newTokens.expires_in}s`,
      );

      await this.storeTokens(cellId, {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresIn: newTokens.expires_in,
        clioBaseUrl: record.clioBaseUrl, // preserve the cell's region
      });

      return newTokens.access_token;
    } catch (error: unknown) {
      const msg = this.extractMessage(error);
      this.logger.error(`[TOKEN] ❌ Refresh failed for cell ${cellId}: ${msg}`);

      await this.prisma.cell.update({
        where: { id: cellId },
        data: { status: CellStatus.DISCONNECTED },
      });

      throw new UnauthorizedException(
        'Clio session expired. Please reconnect your cell to Clio.',
      );
    }
  }

  // ─── Credentials ──────────────────────────────────────────────────────────

  getClioClientId(): string {
    const clientId = process.env.CLIO_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('CLIO_CLIENT_ID is not set in environment');
    }
    return clientId;
  }

  getClioClientSecret(): string {
    const clientSecret = process.env.CLIO_CLIENT_SECRET;
    if (!clientSecret) {
      throw new BadRequestException(
        'CLIO_CLIENT_SECRET is not set in environment',
      );
    }
    return clientSecret;
  }

  // ─── Utils ────────────────────────────────────────────────────────────────

  private extractMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return JSON.stringify(error.response?.data ?? error.message);
    }
    return error instanceof Error ? error.message : String(error);
  }
}
