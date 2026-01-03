"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";

// Polling configuration
const MAX_POLLING_ATTEMPTS = 30; // Maximum number of polling attempts (30 x 2s = 60 seconds)
const POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds

/**
 * Verification Return Page
 * 
 * This page is shown after the user completes (or cancels) the verification payment
 * on the WayForPay checkout page. It polls the verification payment status and 
 * displays the result to the user.
 */
export default function VerificationReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("paymentAccount");
  
  const verificationPaymentId = searchParams?.get("id");
  
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [message, setMessage] = useState("");
  const pollingCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const shouldStopPollingRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!verificationPaymentId) {
      setStatus("failed");
      setMessage("Missing verification payment ID");
      return;
    }

    // Poll for verification payment status
    const pollStatus = async () => {
      // Prevent overlapping requests
      if (isPollingRef.current || shouldStopPollingRef.current) return;
      
      isPollingRef.current = true;
      
      try {
        const response = await fetch(`/api/admin/verification-payments/${verificationPaymentId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch verification payment status");
        }

        const data = await response.json();
        const verificationPayment = data.verificationPayment;

        if (!verificationPayment) {
          throw new Error("Verification payment not found");
        }

        // Check the status
        if (verificationPayment.status === "completed") {
          // Check if the payment account was verified
          if (verificationPayment.paymentAccount?.verificationLevel === "VERIFIED") {
            setStatus("success");
            setMessage(t("messages.verificationComplete"));
          } else {
            setStatus("failed");
            setMessage(verificationPayment.errorMessage || t("messages.verificationFailed"));
          }
          shouldStopPollingRef.current = true;
          // Clear the interval immediately
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (verificationPayment.status === "failed" || verificationPayment.status === "expired") {
          setStatus("failed");
          setMessage(verificationPayment.errorMessage || t("messages.verificationFailed"));
          shouldStopPollingRef.current = true;
          // Clear the interval immediately
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (verificationPayment.status === "pending") {
          // Still pending, continue polling
          setStatus("pending");
          pollingCountRef.current += 1;
          
          // Stop polling after maximum attempts
          if (pollingCountRef.current >= MAX_POLLING_ATTEMPTS) {
            setStatus("pending");
            setMessage("Verification is taking longer than expected. Please check back later.");
            shouldStopPollingRef.current = true;
            // Clear the interval immediately
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error("Error polling verification status:", error);
        setStatus("failed");
        setMessage(error instanceof Error ? error.message : "Failed to check verification status");
        shouldStopPollingRef.current = true;
        // Clear the interval immediately
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      pollStatus();
    }, POLLING_INTERVAL_MS);

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  // Only depend on verificationPaymentId to prevent unnecessary re-creation of the polling interval
  // t is intentionally excluded to prevent effect re-runs on translation changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationPaymentId]);

  const handleReturn = () => {
    router.push("/admin/payment-accounts");
  };

  return (
    <div className="im-container" style={{ maxWidth: "600px", margin: "4rem auto", padding: "2rem" }}>
      <Card>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          {/* Loading state */}
          {status === "loading" && (
            <>
              <div className="im-spinner" style={{ margin: "0 auto 1rem" }}>
                <div className="im-spinner-circle"></div>
              </div>
              <h2 style={{ marginBottom: "1rem" }}>Processing Verification...</h2>
              <p className="im-text-muted">Please wait while we verify your payment.</p>
            </>
          )}

          {/* Pending state (still waiting for callback) */}
          {status === "pending" && (
            <>
              <div className="im-spinner" style={{ margin: "0 auto 1rem" }}>
                <div className="im-spinner-circle"></div>
              </div>
              <h2 style={{ marginBottom: "1rem" }}>Waiting for Payment Confirmation...</h2>
              <p className="im-text-muted">
                {pollingCountRef.current < MAX_POLLING_ATTEMPTS
                  ? "Your payment is being processed. This may take a few moments."
                  : "Verification is taking longer than expected. The payment may have been completed but the confirmation is delayed. Please check your payment accounts page in a few minutes."}
              </p>
            </>
          )}

          {/* Success state */}
          {status === "success" && (
            <>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
              <h2 style={{ marginBottom: "1rem", color: "var(--im-success)" }}>Verification Successful!</h2>
              <p className="im-text-muted" style={{ marginBottom: "2rem" }}>
                {message}
              </p>
              <Button variant="primary" onClick={handleReturn}>
                Return to Payment Accounts
              </Button>
            </>
          )}

          {/* Failed state */}
          {status === "failed" && (
            <>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
              <h2 style={{ marginBottom: "1rem", color: "var(--im-danger)" }}>Verification Failed</h2>
              <p className="im-text-muted" style={{ marginBottom: "2rem" }}>
                {message}
              </p>
              <Button variant="primary" onClick={handleReturn}>
                Return to Payment Accounts
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
