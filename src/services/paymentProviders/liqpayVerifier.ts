/**
 * LiqPay Payment Provider Verifier
 * 
 * Verifies LiqPay merchant credentials by making a safe API call
 * that does not create any transactions or charges.
 */

import { PaymentProvider } from "@/types/paymentAccount";
import { PaymentProviderVerifier, ProviderVerificationResult } from "./types";
import crypto from "crypto";

export class LiqPayVerifier implements PaymentProviderVerifier {
  provider = PaymentProvider.LIQPAY;
  
  private readonly API_URL = "https://www.liqpay.ua/api/request";
  
  /**
   * Verify LiqPay credentials
   * 
   * Uses the payment/status API to validate credentials without creating transactions.
   * This is a safe, non-charging verification method.
   * 
   * @param merchantId - LiqPay public key
   * @param secretKey - LiqPay private key
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
          error: "Invalid public key",
          errorCode: "INVALID_PUBLIC_KEY",
          timestamp,
        };
      }
      
      if (!secretKey || typeof secretKey !== "string" || secretKey.trim() === "") {
        return {
          success: false,
          error: "Invalid private key",
          errorCode: "INVALID_PRIVATE_KEY",
          timestamp,
        };
      }
      
      // Create a test request to verify credentials
      // LiqPay uses Base64 encoding and SHA1 signature
      const orderId = `verify_${Date.now()}`;
      
      const requestData = {
        version: "3",
        public_key: merchantId,
        action: "status",
        order_id: orderId,
      };
      
      // Encode data to Base64
      const dataBase64 = Buffer.from(JSON.stringify(requestData)).toString("base64");
      
      // Create signature: base64_encode(sha1(private_key + data + private_key))
      const signatureString = secretKey + dataBase64 + secretKey;
      const signature = crypto
        .createHash("sha1")
        .update(signatureString)
        .digest("base64");
      
      // Make API request
      const formData = new URLSearchParams();
      formData.append("data", dataBase64);
      formData.append("signature", signature);
      
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
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
      if (data.err_code === "err_signature") {
        // Invalid signature - credentials are incorrect
        return {
          success: false,
          error: "Invalid merchant credentials",
          errorCode: "INVALID_CREDENTIALS",
          timestamp,
        };
      }
      
      if (data.err_code === "err_public_key") {
        // Invalid public key
        return {
          success: false,
          error: "Invalid public key",
          errorCode: "INVALID_PUBLIC_KEY",
          timestamp,
        };
      }
      
      // If we get a response about order not found, that's fine
      // It means the API authenticated our request successfully
      if (data.status === "error" && data.err_code === "order_not_found") {
        return {
          success: true,
          timestamp,
        };
      }
      
      // If we get any other response without authentication errors,
      // consider credentials valid
      if (!data.err_code || data.err_code === "order_not_found") {
        return {
          success: true,
          timestamp,
        };
      }
      
      // Unknown error
      return {
        success: false,
        error: data.err_description || "Unknown verification error",
        errorCode: data.err_code || "UNKNOWN_ERROR",
        timestamp,
      };
      
    } catch (error) {
      console.error("[LiqPayVerifier] Verification error:", error);
      
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
