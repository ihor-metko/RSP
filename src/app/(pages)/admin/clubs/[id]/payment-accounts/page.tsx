"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Breadcrumbs, ConfirmationModal, Card } from "@/components/ui";
import { PaymentAccountList } from "@/components/admin/payment-accounts/PaymentAccountList";
import { PaymentAccountForm, PaymentAccountFormData } from "@/components/admin/payment-accounts/PaymentAccountForm";
import { useUserStore } from "@/stores/useUserStore";
import { useClubStore } from "@/stores/useClubStore";
import type { MaskedPaymentAccount } from "@/types/paymentAccount";
import "./page.css";

interface PaymentAccountStatus {
  isConfigured: boolean;
  provider: string | null;
  scope: "ORGANIZATION" | "CLUB" | null;
  displayName: string | null;
}

export default function ClubPaymentAccountsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [clubId, setClubId] = useState<string | null>(null);
  
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const user = useUserStore((state) => state.user);
  
  const currentClub = useClubStore((state) => state.currentClub);
  const fetchClubById = useClubStore((state) => state.fetchClubById);
  
  const [accounts, setAccounts] = useState<MaskedPaymentAccount[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedAccount, setSelectedAccount] = useState<MaskedPaymentAccount | null>(null);
  
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [accountToDisable, setAccountToDisable] = useState<MaskedPaymentAccount | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  // Fetch club details
  useEffect(() => {
    if (clubId && isLoggedIn && !isLoadingStore) {
      fetchClubById(clubId);
    }
  }, [clubId, isLoggedIn, isLoadingStore, fetchClubById]);

  // Authorization check
  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Only club owners can manage club-level payment accounts
    if (!adminStatus?.isAdmin) {
      router.push("/auth/sign-in");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router]);

  const fetchAccounts = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch club payment accounts
      const accountsResponse = await fetch(`/api/admin/clubs/${clubId}/payment-accounts`);
      if (!accountsResponse.ok) {
        throw new Error("Failed to load payment accounts");
      }
      const accountsData = await accountsResponse.json();
      setAccounts(accountsData.paymentAccounts || []);

      // Fetch payment status (to show active account info)
      const statusResponse = await fetch(`/api/admin/clubs/${clubId}/payment-accounts/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setPaymentStatus(statusData.status || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load payment accounts";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (clubId && isLoggedIn && !isLoadingStore) {
      fetchAccounts();
    }
  }, [clubId, isLoggedIn, isLoadingStore, fetchAccounts]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddAccount = () => {
    setFormMode("add");
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleEditAccount = (account: MaskedPaymentAccount) => {
    setFormMode("edit");
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleDisableAccount = (account: MaskedPaymentAccount) => {
    setAccountToDisable(account);
    setIsDisableModalOpen(true);
  };

  const handleFormSubmit = async (formData: PaymentAccountFormData) => {
    if (!clubId || !user) return;

    try {
      if (formMode === "add") {
        const response = await fetch(`/api/admin/clubs/${clubId}/payment-accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: formData.provider,
            merchantId: formData.merchantId,
            secretKey: formData.secretKey,
            displayName: formData.displayName || null,
            isActive: formData.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create payment account");
        }

        showToast(t("paymentAccount.messages.addSuccess"), "success");
      } else if (formMode === "edit" && selectedAccount) {
        const response = await fetch(
          `/api/admin/clubs/${clubId}/payment-accounts/${selectedAccount.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merchantId: formData.merchantId,
              secretKey: formData.secretKey,
              displayName: formData.displayName || null,
              isActive: formData.isActive,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update payment account");
        }

        showToast(t("paymentAccount.messages.updateSuccess"), "success");
      }

      await fetchAccounts();
      setIsFormOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Operation failed";
      throw new Error(errorMessage);
    }
  };

  const confirmDisableAccount = async () => {
    if (!accountToDisable || !clubId) return;

    try {
      const response = await fetch(
        `/api/admin/clubs/${clubId}/payment-accounts/${accountToDisable.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disable payment account");
      }

      showToast(t("paymentAccount.messages.disableSuccess"), "success");
      await fetchAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to disable account";
      showToast(errorMessage, "error");
    } finally {
      setIsDisableModalOpen(false);
      setAccountToDisable(null);
    }
  };

  if (isLoadingStore || !clubId) {
    return <div className="im-loading">Loading...</div>;
  }

  const breadcrumbs = [
    { label: t("admin.dashboard"), href: "/admin/dashboard" },
    { label: t("admin.clubs"), href: "/admin/clubs" },
    {
      label: currentClub?.name || t("admin.club"),
      href: `/admin/clubs/${clubId}`,
    },
    { label: t("paymentAccount.breadcrumb"), href: "#" },
  ];

  return (
    <div className="payment-accounts-page">
      <Breadcrumbs items={breadcrumbs} />
      
      <PageHeader
        title={t("paymentAccount.pageTitle.club")}
        description={currentClub?.name || ""}
      />

      {error && <div className="im-error-banner">{error}</div>}

      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Active Payment Account Status */}
      {paymentStatus && (
        <Card className="payment-status-card">
          <h3 className="im-card-title">{t("paymentAccount.status.title")}</h3>
          {paymentStatus.isConfigured ? (
            <div className="payment-status-content">
              <div className="payment-status-item">
                <span className="im-label">{t("paymentAccount.status.provider")}:</span>
                <span className="im-value">{paymentStatus.provider}</span>
              </div>
              <div className="payment-status-item">
                <span className="im-label">{t("paymentAccount.status.source")}:</span>
                <span className={`im-value im-scope-${paymentStatus.scope?.toLowerCase()}`}>
                  {paymentStatus.scope === "CLUB"
                    ? t("paymentAccount.status.clubLevel")
                    : t("paymentAccount.status.organizationLevel")}
                </span>
              </div>
              {paymentStatus.displayName && (
                <div className="payment-status-item">
                  <span className="im-label">{t("paymentAccount.status.displayName")}:</span>
                  <span className="im-value">{paymentStatus.displayName}</span>
                </div>
              )}
              {paymentStatus.scope === "ORGANIZATION" && (
                <p className="im-status-hint">
                  {t("paymentAccount.status.fallbackHint")}
                </p>
              )}
            </div>
          ) : (
            <p className="im-not-configured">{t("paymentAccount.status.notConfigured")}</p>
          )}
        </Card>
      )}

      <PaymentAccountList
        accounts={accounts}
        loading={loading}
        onAdd={handleAddAccount}
        onEdit={handleEditAccount}
        onDisable={handleDisableAccount}
        scope="CLUB"
        showScopeInfo
      />

      <PaymentAccountForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        account={selectedAccount}
        mode={formMode}
        scope="CLUB"
      />

      <ConfirmationModal
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        onConfirm={confirmDisableAccount}
        title={t("paymentAccount.disableModal.title")}
        message={t("paymentAccount.disableModal.message")}
        confirmText={t("paymentAccount.disableModal.confirm")}
        cancelText={t("paymentAccount.disableModal.cancel")}
      />
    </div>
  );
}
