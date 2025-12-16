/**
 * WayForPay Payment Provider Verifier
 * 
 * Verifies WayForPay merchant credentials using a secure test payment request.
 * This approach creates a minimal payment request (1 UAH) to validate credentials
 * without charging real money.
 * 
 * NOTE: WayForPay's CHECK_STATUS and TRANSACTION_LIST APIs are NOT reliable for
 * credential verification as they may return success even with invalid credentials.
 */

import { PaymentProvider } from "@/types/paymentAccount";
import { PaymentProviderVerifier, ProviderVerificationResult } from "./types";
import crypto from "crypto";

export class WayForPayVerifier implements PaymentProviderVerifier {
  provider = PaymentProvider.WAYFORPAY;
  
  private readonly API_URL = "https://api.wayforpay.com/api";
  
  /**
   * Verify WayForPay credentials using secure test payment request
   * 
   * Creates a minimal test payment request (1 UAH) with test data.
   * The request validates credentials through signature verification.
   * No real payment is processed - this is purely for credential validation.
   * 
   * @param merchantId - WayForPay merchant account
   * @param secretKey - WayForPay secret key
   * @param providerConfig - Optional additional configuration (unused for WayForPay)
   * @returns Verification result
   */
  async verify(
    merchantId: string,
    secretKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      
      // Create test payment request parameters
      // Using minimal amount (1 UAH) with test data
      const orderReference = `verify_${Date.now()}`;
      const orderDate = Math.floor(Date.now() / 1000);
      const amount = "1";
      const currency = "UAH";
      const merchantDomainName = "arenaone.test";
      const productName = "Verification";
      const productCount = "1";
      const productPrice = "1";
      
      // Generate signature for PURCHASE request
      // Signature string: merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName;productCount;productPrice
      const signatureString = [
        merchantId,
        merchantDomainName,
        orderReference,
        orderDate,
        amount,
        currency,
        productName,
        productCount,
        productPrice,
      ].join(";");
      
      const signature = crypto
        .createHmac("md5", secretKey)
        .update(signatureString)
        .digest("hex");
      
      // Make test payment request to verify credentials
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionType: "PURCHASE",
          merchantAccount: merchantId,
          merchantAuthType: "SimpleSignature",
          merchantDomainName,
          orderReference,
          orderDate,
          amount,
          currency,
          productName: [productName],
          productCount: [productCount],
          productPrice: [productPrice],
          merchantSignature: signature,
          // Test customer data - no real user interaction
          clientFirstName: "Test",
          clientLastName: "Verification",
          clientEmail: "test@arenaone.verify",
          clientPhone: "380000000000",
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
      
      // Check response for authentication/credential errors
      // reasonCode 1113 = Invalid signature (invalid credentials)
      if (data.reasonCode === 1113 || data.reasonCode === "1113") {
        return {
          success: false,
          error: "Invalid merchant credentials or secret key",
          errorCode: "INVALID_CREDENTIALS",
          timestamp,
        };
      }
      
      // reasonCode 1101 = Merchant account not found or inactive
      if (data.reasonCode === 1101 || data.reasonCode === "1101") {
        return {
          success: false,
          error: "Merchant account not found or inactive",
          errorCode: "MERCHANT_NOT_FOUND",
          timestamp,
        };
      }
      
      // reasonCode 1109 = Format error (but signature was accepted)
      // This means credentials are valid, just request format issue
      if (data.reasonCode === 1109 || data.reasonCode === "1109") {
        return {
          success: true,
          timestamp,
        };
      }
      
      // If we get a response with reasonCode or reason field and it's not a credential error,
      // consider credentials valid (API accepted our signature)
      if (data.reason || data.reasonCode) {
        return {
          success: true,
          timestamp,
        };
      }
      
      // If we get invoiceUrl or paymentURL, credentials are definitely valid
      if (data.invoiceUrl || data.paymentURL) {
        return {
          success: true,
          timestamp,
        };
      }
      
      // Unknown response format
      console.warn("[WayForPayVerifier] Unexpected response format:", data);
      return {
        success: false,
        error: "Unexpected API response format",
        errorCode: "UNEXPECTED_RESPONSE",
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
