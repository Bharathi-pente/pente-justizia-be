// src/modules/clio/security/crypto.utils.ts

import * as crypto from 'crypto';
import {
  CRYPTO_ALGORITHM,
  CRYPTO_IV_LENGTH,
  CRYPTO_TAG_LENGTH,
  CRYPTO_DELIMITER,
} from './crypto.constants';

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a single string: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * All three components are needed for decryption.
 */
export function encrypt(plaintext: string, keyBuffer: Buffer): string {
  const iv = crypto.randomBytes(CRYPTO_IV_LENGTH);

  const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, keyBuffer, iv, {
    authTagLength: CRYPTO_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(CRYPTO_DELIMITER);
}

/**
 * Decrypt a string produced by `encrypt()`.
 *
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decrypt(encryptedString: string, keyBuffer: Buffer): string {
  const parts = encryptedString.split(CRYPTO_DELIMITER);

  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted token format. Expected iv:authTag:ciphertext',
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, keyBuffer, iv, {
    authTagLength: CRYPTO_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
