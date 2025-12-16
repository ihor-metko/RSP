/**
 * Encryption utilities for sensitive data (payment keys, credentials)
 * 
 * Uses AES-256-GCM encryption with environment-based encryption key.
 * All sensitive payment data must be encrypted at rest.
 */

import crypto from "crypto";

// Algorithm configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get the encryption key from environment
 * In production, this should be a strong, randomly generated key stored securely
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // In production, this must be set - fail fast
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY environment variable is required in production");
    }
    
    // For development/testing only
    console.warn("ENCRYPTION_KEY not set, using default key. DO NOT USE IN PRODUCTION!");
    return "default-encryption-key-change-me-in-production-with-strong-key";
  }
  
  return key;
}

/**
 * Derive a cryptographic key from the encryption key and salt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * Encrypt a string value
 * 
 * @param plaintext - The plain text string to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:ciphertext (all base64 encoded)
 * @throws Error if encryption fails
 * 
 * @example
 * const encrypted = encrypt("my-secret-key");
 * // Returns: "base64salt:base64iv:base64tag:base64ciphertext"
 */
export function encrypt(plaintext: string): string {
  try {
    const password = getEncryptionKey();
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password and salt
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return encrypted data in format: salt:iv:authTag:ciphertext
    return [
      salt.toString("base64"),
      iv.toString("base64"),
      authTag.toString("base64"),
      ciphertext,
    ].join(":");
  } catch (error) {
    // Log generic message to avoid exposing sensitive information
    console.error("Encryption failed");
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt an encrypted string value
 * 
 * @param encryptedData - The encrypted string in format: salt:iv:authTag:ciphertext
 * @returns Decrypted plain text string
 * @throws Error if decryption fails or data is tampered
 * 
 * @example
 * const plaintext = decrypt(encryptedData);
 */
export function decrypt(encryptedData: string): string {
  try {
    const password = getEncryptionKey();
    
    // Split the encrypted data
    const parts = encryptedData.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }
    
    const [saltB64, ivB64, authTagB64, ciphertext] = parts;
    
    // Convert from base64
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    
    // Derive the same key
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the ciphertext
    let plaintext = decipher.update(ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");
    
    return plaintext;
  } catch (error) {
    // Log generic message to avoid exposing sensitive information
    console.error("Decryption failed");
    throw new Error("Failed to decrypt data - data may be corrupted or tampered");
  }
}

/**
 * Encrypt a JSON object
 * 
 * @param data - The data object to encrypt
 * @returns Encrypted string
 * @throws Error if data is null, undefined, or not an object
 */
export function encryptJSON(data: Record<string, unknown>): string {
  // Defensive validation: ensure data is a valid object
  if (data === null || data === undefined) {
    throw new Error("Cannot encrypt null or undefined data");
  }
  
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Data must be a non-null object");
  }
  
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt to a JSON object
 * 
 * @param encryptedData - The encrypted string
 * @returns Decrypted object
 */
export function decryptJSON(encryptedData: string): Record<string, unknown> {
  const plaintext = decrypt(encryptedData);
  return JSON.parse(plaintext);
}

/**
 * Check if a string appears to be encrypted data (basic format check)
 * 
 * @param value - The value to check
 * @returns true if the value looks like encrypted data
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 4 && parts.every((part) => part.length > 0);
}
