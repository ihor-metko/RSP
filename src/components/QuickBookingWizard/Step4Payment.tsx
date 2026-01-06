"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import { useEffect, useState } from "react";
import {
  WizardCourt,
  PaymentProvider,
} from "./types";

interface Step4PaymentProps {
  date: string;
  duration: number;
  court: WizardCourt | null;
  totalPrice: number;
  availableProviders: PaymentProvider[];
  selectedProviderId: string | null;
  onSelectProvider: (providerId: string) => void;
  isLoadingProviders: boolean;
  providersError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  isComplete: boolean;
  bookingId: string | null;
}

export function Step4Payment({
  date,
  duration,
  court,
  totalPrice,
  availableProviders,
  selectedProviderId,
  onSelectProvider,
  isLoadingProviders,
  providersError,
  isSubmitting,
  submitError,
  isComplete,
  bookingId,
}: Step4PaymentProps) {
  const t = useTranslations();
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode from document class
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Success state
  if (isComplete && bookingId) {
    return (
      <div className="rsp-wizard-step-content">
        <div className="rsp-wizard-success" role="alert" aria-live="polite">
          <div className="rsp-wizard-success-icon" aria-hidden="true">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <h3 className="rsp-wizard-success-title">
            {t("wizard.bookingConfirmed")}
          </h3>
          <p className="rsp-wizard-success-message">
            {t("wizard.bookingConfirmedMessage")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step4-title">
      <h3 id="step4-title" className="rsp-wizard-step-title">
        {t("wizard.selectPaymentProvider")}
      </h3>

      {submitError && (
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {submitError}
        </div>
      )}

      {providersError && (
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {providersError}
        </div>
      )}

      {/* Short Booking Summary */}
      <div className="rsp-wizard-summary rsp-wizard-summary--compact">
        <div className="rsp-wizard-summary-card rsp-wizard-summary-card--compact">
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("common.date")}</span>
            <span className="rsp-wizard-summary-value">{date}</span>
          </div>
          {court && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
              <span className="rsp-wizard-summary-value">{court.name}</span>
            </div>
          )}
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("common.duration")}</span>
            <span className="rsp-wizard-summary-value">
              {duration} {t("common.minutes")}
            </span>
          </div>
          {court?.type && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("wizard.courtType")}</span>
              <span className="rsp-wizard-summary-value">{court.type}</span>
            </div>
          )}
        </div>

        <div className="rsp-wizard-total">
          <span className="rsp-wizard-total-label">{t("wizard.total")}</span>
          <span className="rsp-wizard-total-value">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Payment Providers */}
      {isLoadingProviders ? (
        <div className="rsp-wizard-loading" role="status">
          <span className="rsp-wizard-spinner" aria-hidden="true" />
          <span>{t("wizard.loadingProviders")}</span>
        </div>
      ) : availableProviders.length === 0 ? (
        <div className="rsp-wizard-alert rsp-wizard-alert--warning" role="alert">
          {t("wizard.noPaymentProvidersAvailable")}
        </div>
      ) : (
        <div
          className="rsp-wizard-payment-providers"
          role="radiogroup"
          aria-label={t("wizard.selectPaymentProvider")}
        >
          {availableProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              role="radio"
              aria-checked={selectedProviderId === provider.id}
              className={`rsp-wizard-payment-provider ${
                selectedProviderId === provider.id
                  ? "rsp-wizard-payment-provider--selected"
                  : ""
              }`}
              onClick={() => onSelectProvider(provider.id)}
              disabled={isSubmitting}
            >
              <img
                src={isDark ? provider.logoDark : provider.logoLight}
                alt={provider.displayName}
                className="rsp-wizard-payment-provider-logo"
                loading="lazy"
              />
              <span className="rsp-wizard-payment-provider-label">
                {provider.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
