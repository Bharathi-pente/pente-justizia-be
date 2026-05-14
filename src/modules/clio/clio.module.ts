// src/modules/clio/clio.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClioController } from './clio.controller';
import { ClioOAuthService } from './clio-oauth.service';
import { ClioTokenService } from './clio-token.service';
import { TokenEncryptionService } from './security/token-encryption.service';
import { SyncModule } from '../sync/sync.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => SyncModule)],
  controllers: [ClioController],
  providers: [ClioOAuthService, ClioTokenService, TokenEncryptionService],
  exports: [ClioTokenService, ClioOAuthService, TokenEncryptionService],
})
export class ClioModule {}
