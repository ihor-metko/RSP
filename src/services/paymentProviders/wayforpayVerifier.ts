/**
 * WayForPay Payment Provider Verifier
 * 
 * Verifies WayForPay merchant credentials by making a safe API call
 * that does not create any transactions or charges.
 */

import { PaymentProvider } from "@/types/paymentAccount";
import { PaymentProviderVerifier, ProviderVerificationResult } from "./types";
import crypto from "crypto";

export class WayForPayVerifier implements PaymentProviderVerifier {
  provider = PaymentProvider.WAYFORPAY;
  
  private readonly API_URL = "https://api.wayforpay.com/api";
  
  /**
   * Verify WayForPay credentials
   * 
   * Uses the merchant_check API to validate credentials without creating transactions.
   * This is a safe, non-charging verification method.
   * 
   * @param merchantId - WayForPay merchant account
   * @param secretKey - WayForPay secret key
   * @param providerConfig - Optional additional configuration
   * @returns Verification result
   */
  async verify(
    merchantId: string,
    secretKey: string,
    providerConfig?: Record<string, unknown> | null
  ): Promise<ProviderVerificationResult> {
    const timestamp = new Date();
    
    try {
      // Validate inputs
      if (!merchantId || typeof merchantId !== "string" || merchantId.trim() === "") {
        return {
          success: false,
          error: "Invalid merchant ID",
          errorCode: "INVALID_MERCHANT_ID",
          timestamp,
        };
      }
      
      if (!secretKey || typeof secretKey !== "string" || secretKey.trim() === "") {
        return {
          success: false,
          error: "Invalid secret key",
          errorCode: "INVALID_SECRET_KEY",
          timestamp,
        };
      }
      
      // Create a test signature to verify credentials
      // WayForPay uses HMAC-MD5 for signature generation
      const orderReference = `verify_${Date.now()}`;
      const orderDate = Math.floor(Date.now() / 1000);
      
      // Signature string for merchant check: merchantAccount;orderReference;orderDate
      const signatureString = `${merchantId};${orderReference};${orderDate}`;
      const signature = crypto
        .createHmac("md5", secretKey)
        .update(signatureString)
        .digest("hex");
      
      // Make API request to check merchant status
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionType: "CHECK_STATUS",
          merchantAccount: merchantId,
          orderReference,
          merchantSignature: signature,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `API request failed with status ${response.status}`,
          errorCode: "API_ERROR",
          timestamp,
        };
      }
      
      const data = await response.json();
      
      // Check response for authentication errors
      if (data.reasonCode === 1100) {
        // Order not found - this is expected and means credentials are valid
        return {
          success: true,
          timestamp,
        };
      }
      
      if (data.reasonCode === 1001) {
        // Invalid signature - credentials are incorrect
        return {
          success: false,
          error: "Invalid merchant credentials",
          errorCode: "INVALID_CREDENTIALS",
          timestamp,
        };
      }
      
      if (data.reasonCode === 1101) {
        // Merchant account not found or inactive
        return {
          success: false,
          error: "Merchant account not found or inactive",
          errorCode: "MERCHANT_NOT_FOUND",
          timestamp,
        };
      }
      
      // If we get any other response, consider credentials valid
      // (the API responded to our authenticated request)
      return {
        success: true,
        timestamp,
      };
      
    } catch (error) {
      console.error("[WayForPayVerifier] Verification error:", error);
      
      let errorMessage = "Verification failed";
      let errorCode = "UNKNOWN_ERROR";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          errorCode = "TIMEOUT";
          errorMessage = "Verification request timed out";
        } else if (error.message.includes("fetch") || error.message.includes("network")) {
          errorCode = "NETWORK_ERROR";
          errorMessage = "Network error during verification";
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode,
        timestamp,
      };
    }
  }
}
