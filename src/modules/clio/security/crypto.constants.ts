// src/modules/clio/security/crypto.constants.ts

export const CRYPTO_ALGORITHM = 'aes-256-gcm' as const;
export const CRYPTO_KEY_LENGTH = 32; // bytes — AES-256
export const CRYPTO_IV_LENGTH = 12; // bytes — GCM standard
export const CRYPTO_TAG_LENGTH = 16; // bytes — GCM auth tag

/**
 * The delimiter used to join iv:tag:ciphertext into a single storable string.
 * Must not appear in base64 output — colon is safe.
 */
export const CRYPTO_DELIMITER = ':' as const;

/**
 * Environment variable name for the 32-byte hex-encoded encryption key.
 * Generate with: openssl rand -hex 32
 */
export const CRYPTO_KEY_ENV = 'TOKEN_ENCRYPTION_KEY' as const;
