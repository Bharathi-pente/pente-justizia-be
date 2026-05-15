// src/modules/clio/security/token-encryption.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CRYPTO_KEY_LENGTH, CRYPTO_KEY_ENV } from './crypto.constants';
import { encrypt, decrypt } from './crypto.utils';

@Injectable()
export class TokenEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(TokenEncryptionService.name);
  private keyBuffer!: Buffer;

  constructor(private readonly config: ConfigService) {}

  /**
   * Validate and load the encryption key at startup.
   * Fails hard if the key is missing or the wrong length —
   * better to crash on boot than silently store plain tokens.
   */
  onModuleInit(): void {
    const rawKey = this.config.get<string>(CRYPTO_KEY_ENV);

    if (!rawKey) {
      throw new Error(
        `[TokenEncryption] ${CRYPTO_KEY_ENV} is not set. ` +
          `Generate one with: openssl rand -hex 32`,
      );
    }

    const keyBytes = Buffer.from(rawKey, 'hex');

    if (keyBytes.length !== CRYPTO_KEY_LENGTH) {
      throw new Error(
        `[TokenEncryption] ${CRYPTO_KEY_ENV} must be a ${CRYPTO_KEY_LENGTH * 2}-char hex string ` +
          `(${CRYPTO_KEY_LENGTH} bytes). Got ${keyBytes.length} bytes.`,
      );
    }

    this.keyBuffer = keyBytes;
    this.logger.log('[TokenEncryption] ✅ Encryption key loaded successfully');
  }

  /**
   * Encrypt a token before storing in the database.
   * Each call produces a different ciphertext (random IV per call).
   */
  encryptToken(plainToken: string): string {
    if (!plainToken) {
      throw new Error('[TokenEncryption] Cannot encrypt empty token');
    }
    return encrypt(plainToken, this.keyBuffer);
  }

  /**
   * Decrypt a token retrieved from the database.
   * Throws if the stored value was tampered with.
   */
  decryptToken(encryptedToken: string): string {
    if (!encryptedToken) {
      throw new Error('[TokenEncryption] Cannot decrypt empty value');
    }
    return decrypt(encryptedToken, this.keyBuffer);
  }
}
