/**
 * Payment Provider Verification Types
 * 
 * Common types and interfaces for payment provider verification
 */

import { PaymentProvider } from "@/types/paymentAccount";

/**
 * Result of a payment provider verification attempt
 */
export interface ProviderVerificationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  timestamp: Date;
}

/**
 * Base interface for payment provider verifiers
 */
export interface PaymentProviderVerifier {
  provider: PaymentProvider;
  
  /**
   * Verify payment provider credentials
   * Performs a safe, non-charging validation
   * 
   * @param merchantId - Merchant ID (decrypted)
   * @param secretKey - Secret key (decrypted)
   * @param providerConfig - Additional provider configuration (decrypted)
   * @returns Verification result
   */
  verify(
    merchantId: string,
    secretKey: string,
    providerConfig?: Record<string, unknown> | null
  ): Promise<ProviderVerificationResult>;
}
