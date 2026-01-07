"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Modal } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { formatDateTimeLong, formatDateLong } from "@/utils/date";
import { getClubTimezone } from "@/constants/timezone";
import { utcToClubLocal } from "@/utils/dateTime";
import Image from "next/image";
import { useTheme } from "@/hooks/useTheme";

interface PaymentProviderInfo {
  id: string;
  name: string;
  displayName: string;
  logoLight: string;
  logoDark: string;
}

interface BookingInfo {
  id: string;
  courtId: string;
  courtName: string;
  clubId: string;
  clubName: string;
  clubTimezone?: string;
  startTime: string; // UTC ISO string
  endTime: string; // UTC ISO string
  price: number;
  reservationExpiresAt: string | null;
}

interface ResumePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onPaymentComplete?: () => void;
}

// Time validation constants
const MIN_HOUR = 0;
const MAX_HOUR = 23;
const MIN_MINUTE = 0;
const MAX_MINUTE = 59;

export function ResumePaymentModal({
  isOpen,
  onClose,
  bookingId,
  onPaymentComplete,
}: ResumePaymentModalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const theme = useTheme();

  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderInfo | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // Fetch booking details and extend reservation when modal opens
  useEffect(() => {
    if (!isOpen || !bookingId) return;

    const fetchBookingDetails = async () => {
      setIsLoadingBooking(true);
      setError(null);

      try {
        // Call resume-payment endpoint to validate and extend reservation
        const response = await fetch(`/api/bookings/${bookingId}/resume-payment`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load booking details");
          setIsExpired(true);
          return;
        }

        const data = await response.json();
        
        // Fetch club details to get timezone
        const clubResponse = await fetch(`/api/clubs/${data.clubId}`);
        let clubTimezone: string | undefined;
        
        if (clubResponse.ok) {
          const clubData = await clubResponse.json();
          clubTimezone = clubData.timezone;
        }

        setBookingInfo({
          ...data,
          clubTimezone,
        });
      } catch (err) {
        console.error("Error fetching booking details:", err);
        setError("Failed to load booking details");
        setIsExpired(true);
      } finally {
        setIsLoadingBooking(false);
      }
    };

    fetchBookingDetails();
  }, [isOpen, bookingId]);

  // Fetch payment providers when booking info is loaded
  useEffect(() => {
    if (!bookingInfo?.clubId) return;

    const fetchPaymentProviders = async () => {
      setIsLoadingProviders(true);

      try {
        const response = await fetch(`/api/clubs/${bookingInfo.clubId}/payment-providers`);
        
        if (response.ok) {
          const data = await response.json();
          setPaymentProviders(data.providers || []);
        }
      } catch (err) {
        console.error("Error fetching payment providers:", err);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    fetchPaymentProviders();
  }, [bookingInfo?.clubId]);

  // Update countdown timer
  useEffect(() => {
    if (!bookingInfo?.reservationExpiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(bookingInfo.reservationExpiresAt!).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining === 0) {
        setIsExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [bookingInfo?.reservationExpiresAt]);

  // Format time remaining
  const formatTimeRemaining = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Format booking date and time in club timezone
  const formatBookingDateTime = useCallback((startUTC: string, endUTC: string, timezone?: string): string => {
    try {
      const clubTz = getClubTimezone(timezone);
      
      // Convert UTC to club local time
      const startLocal = utcToClubLocal(startUTC, clubTz);
      const endLocal = utcToClubLocal(endUTC, clubTz);
      
      // Format date and time
      const dateStr = formatDateLong(new Date(startLocal), locale);
      const startTime = new Date(startLocal).toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const endTime = new Date(endLocal).toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      return `${dateStr}, ${startTime} - ${endTime}`;
    } catch (error) {
      console.error("Error formatting booking date time:", error);
      return formatDateLong(new Date(startUTC), locale);
    }
  }, [locale]);

  // Calculate duration in minutes
  const calculateDuration = useCallback((startUTC: string, endUTC: string): number => {
    const start = new Date(startUTC).getTime();
    const end = new Date(endUTC).getTime();
    return Math.round((end - start) / (1000 * 60));
  }, []);

  // Handle payment submission
  const handleSubmit = useCallback(async () => {
    if (!selectedProvider || !bookingInfo || isExpired) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentProvider: selectedProvider.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to initiate payment");
        return;
      }

      // Open payment gateway checkout URL
      if (data.checkoutUrl) {
        const paymentWindow = window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        
        if (!paymentWindow) {
          setError(t("wizard.paymentWindowBlocked"));
        } else {
          // Payment window opened successfully
          // Call onPaymentComplete callback if provided
          onPaymentComplete?.();
          onClose();
        }
      } else {
        setError("No checkout URL received");
      }
    } catch (err) {
      console.error("Error initiating payment:", err);
      setError("An error occurred while initiating payment");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProvider, bookingInfo, isExpired, bookingId, onPaymentComplete, onClose, t]);

  // Handle close modal - redirect to booking again if expired
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("wizard.step3Title")}
      className="rsp-wizard-modal"
    >
      <div className="rsp-wizard-step-content">
        {isLoadingBooking ? (
          <div className="rsp-wizard-loading">
            {t("wizard.loadingBookingDetails")}
          </div>
        ) : isExpired ? (
          <div className="rsp-wizard-expired-container">
            <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
              {error || t("wizard.reservationExpired")}
            </div>
            <div className="rsp-wizard-expired-actions">
              <button
                type="button"
                className="rsp-wizard-btn rsp-wizard-btn--primary"
                onClick={handleClose}
              >
                {t("wizard.close")}
              </button>
            </div>
          </div>
        ) : bookingInfo ? (
          <>
            {/* Reservation Timer */}
            {timeRemaining > 0 && (
              <div className="rsp-wizard-reservation-timer" role="timer" aria-live="polite">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  {t("wizard.reservationExpiresIn", { time: formatTimeRemaining(timeRemaining) })}
                </span>
              </div>
            )}

            {/* Status Message */}
            <div className="rsp-wizard-status-message">
              <p>{t("wizard.reservedPaymentPending")}</p>
            </div>

            {error && (
              <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
                {error}
              </div>
            )}

            {/* Locked Booking Summary */}
            <div className="rsp-wizard-summary">
              <h3 className="rsp-wizard-summary-title">{t("wizard.bookingDetails")}</h3>
              <div className="rsp-wizard-summary-card rsp-wizard-summary-card--locked">
                <div className="rsp-wizard-summary-row">
                  <span className="rsp-wizard-summary-label">{t("wizard.club")}</span>
                  <span className="rsp-wizard-summary-value">{bookingInfo.clubName}</span>
                </div>
                <div className="rsp-wizard-summary-row">
                  <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
                  <span className="rsp-wizard-summary-value">{bookingInfo.courtName}</span>
                </div>
                <div className="rsp-wizard-summary-row">
                  <span className="rsp-wizard-summary-label">{t("booking.summary.dateTime")}</span>
                  <span className="rsp-wizard-summary-value">
                    {formatBookingDateTime(bookingInfo.startTime, bookingInfo.endTime, bookingInfo.clubTimezone)}
                  </span>
                </div>
                <div className="rsp-wizard-summary-row">
                  <span className="rsp-wizard-summary-label">{t("common.duration")}</span>
                  <span className="rsp-wizard-summary-value">
                    {calculateDuration(bookingInfo.startTime, bookingInfo.endTime)} {t("common.minutes")}
                  </span>
                </div>
              </div>

              <div className="rsp-wizard-total">
                <span className="rsp-wizard-total-label">{t("booking.summary.total")}</span>
                <span className="rsp-wizard-total-value">{formatPrice(bookingInfo.price)}</span>
              </div>
            </div>

            {/* Payment Providers */}
            {isLoadingProviders ? (
              <div className="rsp-wizard-loading">
                {t("wizard.loadingPaymentProviders")}
              </div>
            ) : paymentProviders.length === 0 ? (
              <div className="rsp-wizard-alert rsp-wizard-alert--warning" role="alert">
                {t("wizard.noPaymentProvidersAvailable")}
              </div>
            ) : (
              <div
                className="rsp-wizard-payment-methods"
                role="radiogroup"
                aria-label={t("wizard.selectPaymentProvider")}
              >
                {paymentProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedProvider?.id === provider.id}
                    className={`rsp-wizard-payment-method ${selectedProvider?.id === provider.id
                      ? "rsp-wizard-payment-method--selected"
                      : ""
                    }`}
                    onClick={() => setSelectedProvider(provider)}
                    disabled={isSubmitting || timeRemaining === 0}
                  >
                    <div className="rsp-wizard-payment-method-logo">
                      <Image
                        src={theme === "dark" ? provider.logoDark : provider.logoLight}
                        alt={provider.displayName}
                        width={80}
                        height={32}
                        style={{ objectFit: "contain" }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <span className="rsp-wizard-payment-method-label">
                      {provider.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="rsp-wizard-actions">
              <button
                type="button"
                className="rsp-wizard-btn rsp-wizard-btn--secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rsp-wizard-btn rsp-wizard-btn--primary"
                onClick={handleSubmit}
                disabled={!selectedProvider || isSubmitting || timeRemaining === 0}
              >
                {isSubmitting
                  ? t("wizard.processing")
                  : t("wizard.payAmount", { amount: formatPrice(bookingInfo.price) })}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
