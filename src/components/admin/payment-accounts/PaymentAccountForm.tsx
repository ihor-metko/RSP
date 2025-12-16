"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import { PaymentProvider, MaskedPaymentAccount } from "@/types/paymentAccount";
import "./PaymentAccountForm.css";

interface PaymentAccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentAccountFormData) => Promise<void>;
  account?: MaskedPaymentAccount | null;
  mode: "add" | "edit";
  scope: "ORGANIZATION" | "CLUB";
}

export interface PaymentAccountFormData {
  provider: PaymentProvider;
  merchantId: string;
  secretKey: string;
  merchantPassword?: string; // WayForPay specific field
  displayName: string;
  isActive: boolean;
}

export function PaymentAccountForm({
  isOpen,
  onClose,
  onSubmit,
  account,
  mode,
  scope,
}: PaymentAccountFormProps) {
  const t = useTranslations("paymentAccount");
  const [formData, setFormData] = useState<PaymentAccountFormData>({
    provider: PaymentProvider.WAYFORPAY,
    merchantId: "www_arena_one_io",
    secretKey: "92fe0e1960981cc798a08cb05304738e0feb2c5c",
    merchantPassword: "744a754a403ec67ce0cc2fe40ced364f",
    displayName: "Test Account",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mode === "edit" && account) {
      // Pre-fill display name and provider for edit mode
      // Never pre-fill credentials (security requirement)
      setFormData({
        provider: account.provider,
        merchantId: "www_arena_one_io",
        secretKey: "92fe0e1960981cc798a08cb05304738e0feb2c5c",
        merchantPassword: "744a754a403ec67ce0cc2fe40ced364f",
        displayName: account.displayName || "",
        isActive: account.isActive,
      });
    } else if (isOpen && mode === "add") {
      // Reset form for add mode
      setFormData({
        provider: PaymentProvider.WAYFORPAY,
        merchantId: "www_arena_one_io",
        secretKey: "92fe0e1960981cc798a08cb05304738e0feb2c5c",
        merchantPassword: "744a754a403ec67ce0cc2fe40ced364f",
        displayName: "Test Account",
        isActive: true,
      });
    }
    setError(null);
  }, [isOpen, mode, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.provider) {
      setError(t("errors.providerRequired") || "Provider is required");
      return;
    }
    if (!formData.merchantId.trim()) {
      setError(t("errors.merchantIdRequired"));
      return;
    }
    if (!formData.secretKey.trim()) {
      setError(t("errors.secretKeyRequired"));
      return;
    }

    // WayForPay specific validation
    if (formData.provider === PaymentProvider.WAYFORPAY && !formData.merchantPassword?.trim()) {
      setError(t("errors.merchantPasswordRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("errors.submitFailed");
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const providerOptions = [
    { value: PaymentProvider.WAYFORPAY, label: "WayForPay" },
    { value: PaymentProvider.LIQPAY, label: "LiqPay" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? t("form.addTitle") : t("form.editTitle")}
    >
      <form onSubmit={handleSubmit} className="payment-account-form">
        <div className="im-form-section">
          <p className="im-form-hint">
            {scope === "CLUB" ? t("form.hintClub") : t("form.hintOrganization")}
          </p>
        </div>

        <div className="im-form-group">
          <label htmlFor="provider" className="im-label">
            {t("form.provider")} <span className="im-required">*</span>
          </label>
          <select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={handleInputChange}
            disabled={mode === "edit"}
            required
            className="im-select-native"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {mode === "edit" && (
            <small className="im-field-hint">{t("form.providerCannotChange")}</small>
          )}
        </div>

        <div className="im-form-group">
          <label htmlFor="displayName" className="im-label">
            {t("form.displayName")}
          </label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder={t("form.displayNamePlaceholder")}
          />
        </div>

        {/* Provider-specific credential fields */}
        {formData.provider === PaymentProvider.WAYFORPAY ? (
          <>
            {/* WayForPay: Merchant login */}
            <div className="im-form-group">
              <label htmlFor="merchantId" className="im-label">
                {t("form.merchantLogin")} <span className="im-required">*</span>
              </label>
              <Input
                id="merchantId"
                name="merchantId"
                type="text"
                value={formData.merchantId}
                onChange={handleInputChange}
                placeholder={
                  mode === "edit"
                    ? t("form.merchantLoginPlaceholderEdit")
                    : t("form.merchantLoginPlaceholder")
                }
                required
                autoComplete="off"
              />
              {mode === "edit" && (
                <small className="im-field-hint">{t("form.credentialsEditHint")}</small>
              )}
            </div>

            {/* WayForPay: Merchant secret key */}
            <div className="im-form-group">
              <label htmlFor="secretKey" className="im-label">
                {t("form.merchantSecretKey")} <span className="im-required">*</span>
              </label>
              <Input
                id="secretKey"
                name="secretKey"
                type="password"
                value={formData.secretKey}
                onChange={handleInputChange}
                placeholder={
                  mode === "edit"
                    ? t("form.merchantSecretKeyPlaceholderEdit")
                    : t("form.merchantSecretKeyPlaceholder")
                }
                required
                autoComplete="new-password"
              />
            </div>

            {/* WayForPay: Merchant password */}
            <div className="im-form-group">
              <label htmlFor="merchantPassword" className="im-label">
                {t("form.merchantPassword")} <span className="im-required">*</span>
              </label>
              <Input
                id="merchantPassword"
                name="merchantPassword"
                type="password"
                value={formData.merchantPassword || ""}
                onChange={handleInputChange}
                placeholder={
                  mode === "edit"
                    ? t("form.merchantPasswordPlaceholderEdit")
                    : t("form.merchantPasswordPlaceholder")
                }
                required
                autoComplete="new-password"
              />
            </div>
          </>
        ) : (
          <>
            {/* LiqPay: Merchant ID */}
            <div className="im-form-group">
              <label htmlFor="merchantId" className="im-label">
                {t("form.merchantId")} <span className="im-required">*</span>
              </label>
              <Input
                id="merchantId"
                name="merchantId"
                type="text"
                value={formData.merchantId}
                onChange={handleInputChange}
                placeholder={
                  mode === "edit"
                    ? t("form.merchantIdPlaceholderEdit")
                    : t("form.merchantIdPlaceholder")
                }
                required
                autoComplete="off"
              />
              {mode === "edit" && (
                <small className="im-field-hint">{t("form.credentialsEditHint")}</small>
              )}
            </div>

            {/* LiqPay: Secret Key */}
            <div className="im-form-group">
              <label htmlFor="secretKey" className="im-label">
                {t("form.secretKey")} <span className="im-required">*</span>
              </label>
              <Input
                id="secretKey"
                name="secretKey"
                type="password"
                value={formData.secretKey}
                onChange={handleInputChange}
                placeholder={
                  mode === "edit"
                    ? t("form.secretKeyPlaceholderEdit")
                    : t("form.secretKeyPlaceholder")
                }
                required
                autoComplete="new-password"
              />
            </div>
          </>
        )}

        <div className="im-form-group im-form-group--checkbox">
          <label className="im-checkbox-label">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
            />
            <span>{t("form.isActive")}</span>
          </label>
          <small className="im-field-hint">{t("form.isActiveHint")}</small>
        </div>

        {error && <div className="im-error-message">{error}</div>}

        <div className="im-form-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t("form.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting
              ? t("form.saving")
              : mode === "add"
                ? t("form.add")
                : t("form.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
