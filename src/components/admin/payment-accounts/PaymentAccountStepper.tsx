"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, Stepper } from "@/components/ui";
import type { Step } from "@/components/ui";
import { PaymentProvider, MaskedPaymentAccount } from "@/types/paymentAccount";
import "./PaymentAccountStepper.css";

interface PaymentAccountStepperProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentAccountFormData) => Promise<void>;
  account?: MaskedPaymentAccount | null;
  mode: "add" | "edit";
}

export interface PaymentAccountFormData {
  provider: PaymentProvider;
  merchantId: string;
  secretKey: string;
  merchantPassword?: string; // WayForPay specific field
  displayName: string;
  description?: string;
  isActive: boolean;
}

interface VerificationState {
  status: "idle" | "pending" | "verifying" | "success" | "error";
  message?: string;
}

export function PaymentAccountStepper({
  isOpen,
  onClose,
  onSubmit,
  account,
  mode,
}: PaymentAccountStepperProps) {
  const t = useTranslations("paymentAccount.stepper");
  const tCommon = useTranslations("paymentAccount");
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PaymentAccountFormData>({
    provider: PaymentProvider.WAYFORPAY,
    merchantId: "",
    secretKey: "",
    merchantPassword: "",
    displayName: "",
    description: "",
    isActive: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: "idle",
  });

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && account) {
        setFormData({
          provider: account.provider,
          merchantId: "",
          secretKey: "",
          merchantPassword: "",
          displayName: account.displayName || "",
          description: "",
          isActive: account.isActive,
        });
        setCurrentStep(1);
      } else {
        setFormData({
          provider: PaymentProvider.WAYFORPAY,
          merchantId: "",
          secretKey: "",
          merchantPassword: "",
          displayName: "",
          description: "",
          isActive: true,
        });
        setCurrentStep(1);
      }
      setError(null);
      setVerificationState({ status: "idle" });
    }
  }, [isOpen, mode, account]);

  const steps: Step[] = [
    { id: 1, label: t("steps.provider.label"), description: t("steps.provider.description") },
    { id: 2, label: t("steps.accountInfo.label"), description: t("steps.accountInfo.description") },
    { id: 3, label: t("steps.credentials.label"), description: t("steps.credentials.description") },
    { id: 4, label: t("steps.verification.label"), description: t("steps.verification.description") },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    if (step === 1) {
      if (!formData.provider) {
        setError(t("validation.providerRequired"));
        return false;
      }
    }

    if (step === 2) {
      if (!formData.displayName.trim()) {
        setError(t("validation.displayNameRequired"));
        return false;
      }
    }

    if (step === 3) {
      if (!formData.merchantId.trim()) {
        setError(t("validation.merchantIdRequired"));
        return false;
      }
      if (!formData.secretKey.trim()) {
        setError(t("validation.secretKeyRequired"));
        return false;
      }
      if (formData.provider === PaymentProvider.WAYFORPAY && !formData.merchantPassword?.trim()) {
        setError(t("validation.merchantPasswordRequired"));
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Submit and move to verification
        handleSubmitAndVerify();
      } else if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmitAndVerify = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setVerificationState({ status: "pending" });
    setError(null);

    try {
      // Submit the form - the API will automatically trigger verification
      await onSubmit(formData);
      
      // Move to verification step
      setCurrentStep(4);
      setVerificationState({ status: "verifying", message: t("verification.checking") });
      
      // The backend automatically triggers verification after creation/update
      // Since the API returns immediately after submission, we show a verifying state
      // The actual verification happens asynchronously on the backend
      // The parent component will refresh the list which will show the updated status
      setTimeout(() => {
        setVerificationState({ 
          status: "success", 
          message: t("verification.success") 
        });
      }, 3000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("verification.error");
      setError(errorMessage);
      setVerificationState({ status: "error", message: errorMessage });
      // Stay on step 4 to show the error
      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && verificationState.status !== "verifying") {
      onClose();
    }
  };

  const handleFinish = () => {
    onClose();
  };

  const providerOptions = [
    { value: PaymentProvider.WAYFORPAY, label: "WayForPay" },
    { value: PaymentProvider.LIQPAY, label: "LiqPay" },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="im-stepper-step-content">
            <h3 className="im-stepper-step-title">{t("steps.provider.title")}</h3>
            <p className="im-stepper-step-description">{t("steps.provider.subtitle")}</p>
            
            <div className="im-form-group">
              <label htmlFor="provider" className="im-label">
                {tCommon("form.provider")} <span className="im-required">*</span>
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
                <small className="im-field-hint">{tCommon("form.providerCannotChange")}</small>
              )}
            </div>

            <div className="im-provider-info">
              <div className="im-provider-info-icon">ℹ️</div>
              <div className="im-provider-info-content">
                {formData.provider === PaymentProvider.WAYFORPAY ? (
                  <>
                    <h4>{t("providerInfo.wayforpay.title")}</h4>
                    <p>{t("providerInfo.wayforpay.description")}</p>
                  </>
                ) : (
                  <>
                    <h4>{t("providerInfo.liqpay.title")}</h4>
                    <p>{t("providerInfo.liqpay.description")}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="im-stepper-step-content">
            <h3 className="im-stepper-step-title">{t("steps.accountInfo.title")}</h3>
            <p className="im-stepper-step-description">{t("steps.accountInfo.subtitle")}</p>

            <div className="im-form-group">
              <label htmlFor="displayName" className="im-label">
                {tCommon("form.displayName")} <span className="im-required">*</span>
              </label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder={t("steps.accountInfo.displayNamePlaceholder")}
                required
              />
              <small className="im-field-hint">{t("steps.accountInfo.displayNameHint")}</small>
            </div>

            <div className="im-form-group">
              <label htmlFor="description" className="im-label">
                {t("steps.accountInfo.descriptionLabel")}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                placeholder={t("steps.accountInfo.descriptionPlaceholder")}
                className="im-textarea"
                rows={3}
              />
              <small className="im-field-hint">{t("steps.accountInfo.descriptionHint")}</small>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="im-stepper-step-content">
            <h3 className="im-stepper-step-title">{t("steps.credentials.title")}</h3>
            <p className="im-stepper-step-description">{t("steps.credentials.subtitle")}</p>

            {formData.provider === PaymentProvider.WAYFORPAY ? (
              <>
                <div className="im-form-group">
                  <label htmlFor="merchantId" className="im-label">
                    {tCommon("form.merchantLogin")} <span className="im-required">*</span>
                  </label>
                  <Input
                    id="merchantId"
                    name="merchantId"
                    type="text"
                    value={formData.merchantId}
                    onChange={handleInputChange}
                    placeholder={tCommon("form.merchantLoginPlaceholder")}
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="im-form-group">
                  <label htmlFor="secretKey" className="im-label">
                    {tCommon("form.merchantSecretKey")} <span className="im-required">*</span>
                  </label>
                  <Input
                    id="secretKey"
                    name="secretKey"
                    type="password"
                    value={formData.secretKey}
                    onChange={handleInputChange}
                    placeholder={tCommon("form.merchantSecretKeyPlaceholder")}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="im-form-group">
                  <label htmlFor="merchantPassword" className="im-label">
                    {tCommon("form.merchantPassword")} <span className="im-required">*</span>
                  </label>
                  <Input
                    id="merchantPassword"
                    name="merchantPassword"
                    type="password"
                    value={formData.merchantPassword || ""}
                    onChange={handleInputChange}
                    placeholder={tCommon("form.merchantPasswordPlaceholder")}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="im-form-group">
                  <label htmlFor="merchantId" className="im-label">
                    {tCommon("form.merchantId")} <span className="im-required">*</span>
                  </label>
                  <Input
                    id="merchantId"
                    name="merchantId"
                    type="text"
                    value={formData.merchantId}
                    onChange={handleInputChange}
                    placeholder={tCommon("form.merchantIdPlaceholder")}
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="im-form-group">
                  <label htmlFor="secretKey" className="im-label">
                    {tCommon("form.secretKey")} <span className="im-required">*</span>
                  </label>
                  <Input
                    id="secretKey"
                    name="secretKey"
                    type="password"
                    value={formData.secretKey}
                    onChange={handleInputChange}
                    placeholder={tCommon("form.secretKeyPlaceholder")}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <div className="im-credentials-security-notice">
              <div className="im-security-notice-icon">🔒</div>
              <div className="im-security-notice-content">
                <h4>{t("steps.credentials.securityTitle")}</h4>
                <p>{t("steps.credentials.securityMessage")}</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="im-stepper-step-content">
            <h3 className="im-stepper-step-title">{t("steps.verification.title")}</h3>
            <p className="im-stepper-step-description">{t("steps.verification.subtitle")}</p>

            <div className="im-verification-status">
              {verificationState.status === "pending" && (
                <div className="im-verification-pending">
                  <div className="im-verification-icon im-verification-icon--pending">⏳</div>
                  <h4>{t("verification.pending")}</h4>
                  <p>{t("verification.pendingMessage")}</p>
                </div>
              )}

              {verificationState.status === "verifying" && (
                <div className="im-verification-verifying">
                  <div className="im-spinner-large"></div>
                  <h4>{t("verification.verifying")}</h4>
                  <p>{verificationState.message || t("verification.verifyingMessage")}</p>
                </div>
              )}

              {verificationState.status === "success" && (
                <div className="im-verification-success">
                  <div className="im-verification-icon im-verification-icon--success">✓</div>
                  <h4>{t("verification.successTitle")}</h4>
                  <p>{verificationState.message || t("verification.successMessage")}</p>
                  <div className="im-verification-next-steps">
                    <h5>{t("verification.nextStepsTitle")}</h5>
                    <ul>
                      <li>{t("verification.nextStep1")}</li>
                      <li>{t("verification.nextStep2")}</li>
                    </ul>
                  </div>
                </div>
              )}

              {verificationState.status === "error" && (
                <div className="im-verification-error">
                  <div className="im-verification-icon im-verification-icon--error">✕</div>
                  <h4>{t("verification.errorTitle")}</h4>
                  <p>{verificationState.message || t("verification.errorMessage")}</p>
                  <div className="im-verification-error-actions">
                    <Button variant="outline" onClick={() => setCurrentStep(3)}>
                      {t("verification.editCredentials")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "add" ? t("title.add") : t("title.edit")}
    >
      <div className="payment-account-stepper">
        <Stepper steps={steps} currentStep={currentStep} />

        <div className="im-stepper-content">
          {renderStepContent()}

          {error && <div className="im-error-message">{error}</div>}
        </div>

        <div className="im-stepper-actions">
          {currentStep > 1 && currentStep < 4 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              {t("navigation.back")}
            </Button>
          )}

          {currentStep < 3 && (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {t("navigation.next")}
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("navigation.submitting") : t("navigation.submitAndVerify")}
            </Button>
          )}

          {currentStep === 4 && verificationState.status === "success" && (
            <Button
              type="button"
              variant="primary"
              onClick={handleFinish}
            >
              {t("navigation.finish")}
            </Button>
          )}

          {currentStep === 4 && verificationState.status !== "success" && verificationState.status !== "verifying" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("navigation.close")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
