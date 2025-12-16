/**
 * Payment Provider Verification Factory
 * 
 * Factory to get the appropriate payment provider verifier
 */

import { PaymentProvider } from "@/types/paymentAccount";
import { PaymentProviderVerifier } from "./types";
import { WayForPayVerifier } from "./wayforpayVerifier";
import { LiqPayVerifier } from "./liqpayVerifier";

/**
 * Get payment provider verifier for a specific provider
 * 
 * @param provider - Payment provider
 * @returns Payment provider verifier
 * @throws Error if provider is not supported
 */
export function getPaymentProviderVerifier(provider: PaymentProvider): PaymentProviderVerifier {
  switch (provider) {
    case PaymentProvider.WAYFORPAY:
      return new WayForPayVerifier();
    case PaymentProvider.LIQPAY:
      return new LiqPayVerifier();
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

export * from "./types";
