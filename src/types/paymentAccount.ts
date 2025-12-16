/**
 * Type definitions for Payment Account entities
 * 
 * Payment Accounts represent merchant accounts in payment providers (WayForPay, LiqPay)
 * and are used to process payments for organizations or clubs.
 */

/**
 * Payment provider types supported by the platform
 */
export enum PaymentProvider {
  WAYFORPAY = "WAYFORPAY",
  LIQPAY = "LIQPAY",
}

/**
 * Payment account scope - determines ownership level
 */
export enum PaymentAccountScope {
  ORGANIZATION = "ORGANIZATION",  // Payment account belongs to entire organization
  CLUB = "CLUB",                  // Payment account belongs to specific club
}

/**
 * Payment account status - represents verification state
 */
export enum PaymentAccountStatus {
  PENDING = "PENDING",    // Credentials saved but not yet verified
  ACTIVE = "ACTIVE",      // Credentials verified and payments allowed
  INVALID = "INVALID",    // Credentials failed verification
  DISABLED = "DISABLED",  // Manually disabled by owner
}

/**
 * Core PaymentAccount entity as stored in the database
 * All sensitive fields (merchantId, secretKey, providerConfig) are encrypted at rest
 */
export interface PaymentAccount {
  id: string;
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  
  // Scope identifiers (mutually exclusive based on scope)
  organizationId: string | null;
  clubId: string | null;
  
  // Encrypted credentials (NEVER expose to frontend)
  merchantId: string;      // Encrypted merchant ID / account ID
  secretKey: string;       // Encrypted secret key
  providerConfig: string | null;  // Encrypted JSON for additional provider settings
  
  // Status and metadata
  status: PaymentAccountStatus;  // Verification status
  isActive: boolean;             // Manual enable/disable (deprecated)
  displayName: string | null;    // Optional friendly name for UI
  
  // Verification tracking
  lastVerifiedAt: Date | null;   // Last successful verification timestamp
  verificationError: string | null;  // Last verification error message
  
  // Audit fields
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lastUpdatedBy: string | null;
}

/**
 * Masked payment account for frontend display
 * Contains no sensitive information
 */
export interface MaskedPaymentAccount extends Record<string, unknown> {
  id: string;
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  organizationId: string | null;
  clubId: string | null;
  status: PaymentAccountStatus;  // Verification status
  isActive: boolean;             // Manual enable/disable (deprecated)
  displayName: string | null;
  isConfigured: boolean;         // Whether credentials are set
  lastUpdated: Date;
  lastVerifiedAt: Date | null;   // Last successful verification
  verificationError: string | null;  // Last verification error
}

/**
 * Create/Update payload for PaymentAccount
 * Used when creating or updating payment credentials
 */
export interface PaymentAccountCredentials {
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  organizationId?: string;  // Required if scope = ORGANIZATION
  clubId?: string;          // Required if scope = CLUB
  merchantId: string;       // Plain text - will be encrypted
  secretKey: string;        // Plain text - will be encrypted
  providerConfig?: Record<string, unknown>;  // Will be encrypted if provided
  displayName?: string;
  isActive?: boolean;
}

/**
 * Payment account availability for a specific context
 * Used to indicate whether payment processing is available
 */
export interface PaymentAccountAvailability {
  isConfigured: boolean;
  isAvailable: boolean;  // True only if status is ACTIVE
  provider: PaymentProvider | null;
  scope: PaymentAccountScope | null;
  status: PaymentAccountStatus | null;
  displayName: string | null;
}

/**
 * Result of payment account resolution for a booking
 * Contains decrypted credentials ready for payment processing
 */
export interface ResolvedPaymentAccount {
  id: string;
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  merchantId: string;       // Decrypted
  secretKey: string;        // Decrypted
  providerConfig: Record<string, unknown> | null;  // Decrypted
  displayName: string | null;
}

/**
 * Type guard to check if a value is a valid PaymentProvider
 */
export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === "string" && Object.values(PaymentProvider).includes(value as PaymentProvider);
}

/**
 * Type guard to check if a value is a valid PaymentAccountScope
 */
export function isPaymentAccountScope(value: unknown): value is PaymentAccountScope {
  return typeof value === "string" && Object.values(PaymentAccountScope).includes(value as PaymentAccountScope);
}

/**
 * Type guard to check if a value is a valid PaymentAccountStatus
 */
export function isPaymentAccountStatus(value: unknown): value is PaymentAccountStatus {
  return typeof value === "string" && Object.values(PaymentAccountStatus).includes(value as PaymentAccountStatus);
}

/**
 * Verification result for a payment account
 */
export interface VerificationResult {
  success: boolean;
  error?: string;
  timestamp: Date;
}
