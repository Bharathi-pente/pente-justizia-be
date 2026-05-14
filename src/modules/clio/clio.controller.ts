// src/modules/clio/clio.controller.ts

import {
  Controller,
  Get,
  Query,
  Res,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClioOAuthService } from './clio-oauth.service';
import { ClioTokenService } from './clio-token.service';
import { SyncService } from '../sync/sync.service';

@Controller('clio')
export class ClioController {
  private readonly logger = new Logger(ClioController.name);

  constructor(
    private readonly oauthService: ClioOAuthService,
    private readonly tokenService: ClioTokenService,
    private readonly syncService: SyncService,
  ) {}

  // ── GET /clio/health ──────────────────────────────────────────────────────
  @Get('health')
  health() {
    return {
      status: 'ok',
      module: 'clio',
      timestamp: new Date().toISOString(),
      env: {
        clientId: process.env.CLIO_CLIENT_ID ? '✅ set' : '❌ missing',
        clientSecret: process.env.CLIO_CLIENT_SECRET ? '✅ set' : '❌ missing',
        redirectUri: process.env.CLIO_REDIRECT_URI ? '✅ set' : '❌ missing',
        encryptionKey: process.env.TOKEN_ENCRYPTION_KEY
          ? '✅ set'
          : '❌ missing',
      },
    };
  }

  // ── GET /clio/callback ────────────────────────────────────────────────────
  /**
   * Step 2 of OAuth — Clio redirects here after user approves.
   *
   * ?code=XXX&state=<cellId>
   *
   * On success:
   *  1. Exchange code for tokens (encrypted, stored)
   *  2. Fire-and-forget full sync (non-blocking)
   *  3. Redirect frontend to dashboard
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    this.logger.log(`[CALLBACK] state: ${state}, code present: ${!!code}`);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';

    if (error) {
      this.logger.error(`[CALLBACK] Clio error: ${error}`);
      return res.redirect(
        `${frontendUrl}/onboard?error=${encodeURIComponent(error)}`,
      );
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/onboard?error=missing_code`);
    }

    if (!state) {
      return res.redirect(`${frontendUrl}/onboard?error=missing_state`);
    }

    try {
      const { cellId } = await this.oauthService.exchangeCodeForTokens(
        code,
        state,
      );

      // Fire-and-forget — sync runs in the background, response returns immediately
      this.syncService.runFullSync(cellId).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[CALLBACK] Background sync failed for ${cellId}: ${msg}`,
        );
      });

      this.logger.log(
        `[CALLBACK] ✅ OAuth complete — sync queued for cell: ${cellId}`,
      );

      return res.redirect(`${frontendUrl}/cells/${cellId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[CALLBACK] ❌ ${msg}`);
      return res.redirect(
        `${frontendUrl}/onboard?error=${encodeURIComponent(msg)}`,
      );
    }
  }

  // ── GET /clio/token-status/:cellId ────────────────────────────────────────
  @Get('token-status/:cellId')
  async tokenStatus(@Param('cellId') cellId: string) {
    try {
      return await this.tokenService.getTokenStatus(cellId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }
}
