/**
 * Invite System Utilities
 * 
 * Provides secure token generation, hashing, and verification for the invite system.
 * All tokens are hashed using SHA-256 before storage to prevent token leakage.
 */

import crypto from "crypto";

/**
 * Generate a secure random invite token.
 * Returns a URL-safe base64-encoded random string (256 bits = 32 bytes).
 * 
 * @returns Secure random token string
 * 
 * @example
 * const token = generateInviteToken();
 * // Returns: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
 */
export function generateInviteToken(): string {
  // Generate 32 bytes (256 bits) of random data
  const tokenBytes = crypto.randomBytes(32);
  
  // Convert to URL-safe base64 (replace + with - and / with _)
  return tokenBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, ""); // Remove padding
}

/**
 * Hash an invite token using SHA-256.
 * This is the value stored in the database (tokenHash field).
 * 
 * @param token - The raw invite token to hash
 * @returns SHA-256 hash of the token (hex encoded)
 * 
 * @example
 * const hash = hashInviteToken(token);
 * // Returns: "abc123def456..."
 */
export function hashInviteToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Verify an invite token against a stored hash using constant-time comparison.
 * This prevents timing attacks that could be used to guess valid tokens.
 * 
 * @param token - The raw token to verify
 * @param storedHash - The stored hash from the database
 * @returns true if the token matches the hash
 * 
 * @example
 * const isValid = verifyInviteToken(providedToken, invite.tokenHash);
 * if (isValid) {
 *   // Token is valid
 * }
 */
export function verifyInviteToken(token: string, storedHash: string): boolean {
  const tokenHash = hashInviteToken(token);
  
  // Use crypto.timingSafeEqual for constant-time comparison
  // This prevents timing attacks
  try {
    const tokenBuffer = Buffer.from(tokenHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    
    // Both buffers must be the same length
    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
  } catch {
    // If any error occurs (e.g., invalid hex), return false
    return false;
  }
}

/**
 * Calculate the expiration timestamp for an invite.
 * Default expiration is 7 days from creation.
 * 
 * @param daysFromNow - Number of days until expiration (default: 7)
 * @returns Expiration Date object
 * 
 * @example
 * const expiresAt = getInviteExpiration();
 * // Returns: Date 7 days from now
 */
export function getInviteExpiration(daysFromNow: number = 7): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + daysFromNow);
  return expiration;
}

/**
 * Check if an invite has expired.
 * 
 * @param expiresAt - The expiration timestamp
 * @returns true if the invite has expired
 * 
 * @example
 * if (isInviteExpired(invite.expiresAt)) {
 *   // Invite has expired
 * }
 */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Normalize an email address for comparison.
 * Converts to lowercase and trims whitespace.
 * 
 * @param email - The email address to normalize
 * @returns Normalized email address
 * 
 * @example
 * const normalized = normalizeEmail(" User@Example.COM ");
 * // Returns: "user@example.com"
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
