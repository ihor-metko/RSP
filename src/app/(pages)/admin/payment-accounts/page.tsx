"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, ConfirmationModal, Card, Modal } from "@/components/ui";
import { PaymentAccountList } from "@/components/admin/payment-accounts/PaymentAccountList";
import { PaymentAccountForm, PaymentAccountFormData } from "@/components/admin/payment-accounts/PaymentAccountForm";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { MaskedPaymentAccount } from "@/types/paymentAccount";
import { PaymentAccountStatus } from "@/types/paymentAccount";
import "./page.css";

interface ClubWithAccounts {
  clubId: string;
  clubName: string;
  accounts: MaskedPaymentAccount[];
  isExpanded: boolean;
}

interface PaymentAccountConfigStatus {
  isConfigured: boolean;
  provider: string | null;
  scope: "ORGANIZATION" | "CLUB" | null;
  displayName: string | null;
}

export default function UnifiedPaymentAccountsPage() {
  const router = useRouter();
  const t = useTranslations();

  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const user = useUserStore((state) => state.user);

  const organizations = useOrganizationStore((state) => state.organizations);
  const fetchOrganizations = useOrganizationStore((state) => state.fetchOrganizations);
  const clubs = useAdminClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);

  const [organizationAccounts, setOrganizationAccounts] = useState<MaskedPaymentAccount[]>([]);
  const [clubAccounts, setClubAccounts] = useState<ClubWithAccounts[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentAccountConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedAccount, setSelectedAccount] = useState<MaskedPaymentAccount | null>(null);
  const [selectedScope, setSelectedScope] = useState<"ORGANIZATION" | "CLUB">("ORGANIZATION");
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [accountToDisable, setAccountToDisable] = useState<MaskedPaymentAccount | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Verification modal state
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verifyingAccountId, setVerifyingAccountId] = useState<string | null>(null);
  const [verificationPaymentId, setVerificationPaymentId] = useState<string | null>(null);
  
  // Ref to prevent overlapping polling requests
  const isPollingRef = useRef(false);

  // Determine user role
  const isOrgAdmin = adminStatus?.adminType === "organization_admin";
  const isOrgOwner = isOrgAdmin && adminStatus?.isPrimaryOwner;
  const isClubAdmin = adminStatus?.adminType === "club_admin";
  const orgId = isOrgAdmin && adminStatus?.managedIds?.length ? adminStatus.managedIds[0] : null;
  const clubId = isClubAdmin && adminStatus?.assignedClub ? adminStatus.assignedClub.id : null;

  // Authorization check
  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Only organization owners and club admins can access payment accounts
    if (!adminStatus?.isAdmin || (!isOrgOwner && !isClubAdmin)) {
      router.push("/admin/dashboard");
      return;
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, isOrgOwner, isClubAdmin, router]);

  // Fetch organizations for org owners
  useEffect(() => {
    if (isLoggedIn && !isLoadingStore && isOrgOwner && organizations.length === 0) {
      fetchOrganizations();
    }
  }, [isLoggedIn, isLoadingStore, isOrgOwner, organizations.length, fetchOrganizations]);

  // Fetch clubs for org owners
  useEffect(() => {
    if (isOrgOwner && orgId) {
      fetchClubsIfNeeded();
    }
  }, [isOrgOwner, orgId, fetchClubsIfNeeded]);

  const organization = organizations.find((org) => org.id === orgId);
  const assignedClubName = adminStatus?.assignedClub?.name;

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOrgOwner && orgId) {
        // Fetch organization-level accounts
        const orgResponse = await fetch(`/api/admin/organizations/${orgId}/payment-accounts`);
        if (!orgResponse.ok) {
          throw new Error("Failed to load organization payment accounts");
        }
        const orgData = await orgResponse.json();
        setOrganizationAccounts(orgData.paymentAccounts || []);

        // Fetch club-level accounts for all clubs
        const orgClubs = clubs.filter(club => club.organizationId === orgId);
        const clubAccountsData: ClubWithAccounts[] = [];

        for (const club of orgClubs) {
          try {
            const clubResponse = await fetch(`/api/admin/clubs/${club.id}/payment-accounts`);
            if (clubResponse.ok) {
              const clubData = await clubResponse.json();
              clubAccountsData.push({
                clubId: club.id,
                clubName: club.name,
                accounts: clubData.paymentAccounts || [],
                isExpanded: false,
              });
            }
          } catch (err) {
            console.error(`Failed to fetch accounts for club ${club.id}:`, err);
          }
        }

        setClubAccounts(clubAccountsData);
      } else if (isClubAdmin && clubId) {
        // Fetch club-level accounts only
        const clubResponse = await fetch(`/api/admin/clubs/${clubId}/payment-accounts`);
        if (!clubResponse.ok) {
          throw new Error("Failed to load club payment accounts");
        }
        const clubData = await clubResponse.json();

        const clubName = assignedClubName || t("admin.club");
        setClubAccounts([{
          clubId: clubId,
          clubName: clubName,
          accounts: clubData.paymentAccounts || [],
          isExpanded: true,
        }]);

        // Fetch payment status for club admin
        const statusResponse = await fetch(`/api/admin/clubs/${clubId}/payment-accounts/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setPaymentStatus(statusData.status || null);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load payment accounts";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  // Intentionally excluding `clubs`, `assignedClubName`, and `t` from dependencies:
  // - These are captured from closure and don't affect the fetch logic
  // - Including them causes unnecessary re-creation and polling restarts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgOwner, isClubAdmin, orgId, clubId]);

  useEffect(() => {
    if ((orgId || clubId) && isLoggedIn && !isLoadingStore) {
      fetchAccounts();
    }
  }, [orgId, clubId, isLoggedIn, isLoadingStore, fetchAccounts]);

  // Check if there are any pending accounts (memoized to avoid recalculation)
  const hasPendingAccounts = useMemo(() => {
    const allAccounts = [...organizationAccounts, ...clubAccounts.flatMap(c => c.accounts)];
    return allAccounts.some(account => account.status === PaymentAccountStatus.PENDING);
  }, [organizationAccounts, clubAccounts]);

  // Polling for pending accounts
  useEffect(() => {
    if (!hasPendingAccounts) {
      return; // No polling needed
    }

    // Set up polling every 5 seconds
    const pollInterval = setInterval(() => {
      fetchAccounts();
    }, 5000);

    // Cleanup on unmount or when no more pending accounts
    return () => {
      clearInterval(pollInterval);
    };
  // fetchAccounts is intentionally not in dependencies to prevent polling restart on its recreation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingAccounts]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddOrgAccount = () => {
    setFormMode("add");
    setSelectedAccount(null);
    setSelectedScope("ORGANIZATION");
    setSelectedClubId(null);
    setIsFormOpen(true);
  };

  const handleAddClubAccount = (clubId: string) => {
    setFormMode("add");
    setSelectedAccount(null);
    setSelectedScope("CLUB");
    setSelectedClubId(clubId);
    setIsFormOpen(true);
  };

  const handleEditAccount = (account: MaskedPaymentAccount, clubId?: string) => {
    setFormMode("edit");
    setSelectedAccount(account);
    setSelectedScope(account.scope as "ORGANIZATION" | "CLUB");
    setSelectedClubId(clubId || null);
    setIsFormOpen(true);
  };

  const handleDisableAccount = (account: MaskedPaymentAccount, clubId?: string) => {
    setAccountToDisable(account);
    setSelectedClubId(clubId || null);
    setIsDisableModalOpen(true);
  };

  const handleFormSubmit = async (formData: PaymentAccountFormData) => {
    if (!user) return;

    try {
      // Validate form data before sending
      if (!formData.provider || !formData.merchantId || !formData.secretKey) {
        throw new Error("Missing required fields");
      }

      if (formMode === "add") {
        let url: string;
        if (selectedScope === "ORGANIZATION" && orgId) {
          url = `/api/admin/organizations/${orgId}/payment-accounts`;
        } else if (selectedScope === "CLUB" && selectedClubId) {
          url = `/api/admin/clubs/${selectedClubId}/payment-accounts`;
        } else {
          throw new Error("Invalid scope or missing ID");
        }

        // Build payload with only valid, non-null values
        const payload: Record<string, unknown> = {
          provider: formData.provider,
          merchantId: formData.merchantId.trim(),
          secretKey: formData.secretKey.trim(),
          isActive: formData.isActive !== undefined ? formData.isActive : true,
        };

        // Only include displayName if it has a value
        if (formData.displayName && formData.displayName.trim()) {
          payload.displayName = formData.displayName.trim();
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create payment account");
        }

        showToast(t("paymentAccount.messages.addSuccess"), "success");
      } else if (formMode === "edit" && selectedAccount) {
        let url: string;
        if (selectedScope === "ORGANIZATION" && orgId) {
          url = `/api/admin/organizations/${orgId}/payment-accounts/${selectedAccount.id}`;
        } else if (selectedScope === "CLUB" && selectedClubId) {
          url = `/api/admin/clubs/${selectedClubId}/payment-accounts/${selectedAccount.id}`;
        } else {
          throw new Error("Invalid scope or missing ID");
        }

        // Build payload with only valid, non-null values
        const payload: Record<string, unknown> = {
          merchantId: formData.merchantId.trim(),
          secretKey: formData.secretKey.trim(),
          isActive: formData.isActive !== undefined ? formData.isActive : true,
        };

        // Only include displayName if it has a value
        if (formData.displayName && formData.displayName.trim()) {
          payload.displayName = formData.displayName.trim();
        }

        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

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
    if (!accountToDisable) return;

    try {
      let url: string;
      if (accountToDisable.scope === "ORGANIZATION" && orgId) {
        url = `/api/admin/organizations/${orgId}/payment-accounts/${accountToDisable.id}`;
      } else if (accountToDisable.scope === "CLUB" && selectedClubId) {
        url = `/api/admin/clubs/${selectedClubId}/payment-accounts/${accountToDisable.id}`;
      } else {
        throw new Error("Invalid scope or missing ID");
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

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
      setSelectedClubId(null);
    }
  };

  const handleRetryVerification = async (account: MaskedPaymentAccount, clubId?: string) => {
    if (!user) return;

    try {
      let url: string;
      if (account.scope === "ORGANIZATION" && orgId) {
        url = `/api/admin/organizations/${orgId}/payment-accounts/${account.id}/verify`;
      } else if (account.scope === "CLUB" && (clubId || selectedClubId)) {
        const targetClubId = clubId || selectedClubId;
        url = `/api/admin/clubs/${targetClubId}/payment-accounts/${account.id}/verify`;
      } else {
        throw new Error("Invalid scope or missing ID");
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start verification");
      }

      showToast(t("paymentAccount.messages.verificationStarted"), "success");
      await fetchAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to retry verification";
      showToast(errorMessage, "error");
    }
  };

  const handleVerifyReal = async (account: MaskedPaymentAccount, clubId?: string) => {
    if (!user) return;

    // Set loading state
    setVerifyingAccountId(account.id);

    try {
      let url: string;
      if (account.scope === "ORGANIZATION" && orgId) {
        url = `/api/admin/organizations/${orgId}/payment-accounts/${account.id}/verify-real`;
      } else if (account.scope === "CLUB" && (clubId || selectedClubId)) {
        const targetClubId = clubId || selectedClubId;
        url = `/api/admin/clubs/${targetClubId}/payment-accounts/${account.id}/verify-real`;
      } else {
        throw new Error("Invalid scope or missing ID");
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate verification payment");
      }

      const data = await response.json();
      
      // Open checkout in a new window and show modal with instructions
      if (data.verificationPayment?.checkoutUrl) {
        // Open WayForPay checkout in a new window
        window.open(data.verificationPayment.checkoutUrl, '_blank', 'noopener,noreferrer');
        
        // Show modal with instructions and start polling
        setVerificationPaymentId(data.verificationPayment.id);
        setIsVerificationModalOpen(true);
        // Clear loading state after successfully opening modal
        setVerifyingAccountId(null);
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initiate real payment verification";
      showToast(errorMessage, "error");
      // Clear loading state on error
      setVerifyingAccountId(null);
    }
  };

  const toggleClubExpanded = (clubId: string) => {
    setClubAccounts(prev =>
      prev.map(club =>
        club.clubId === clubId ? { ...club, isExpanded: !club.isExpanded } : club
      )
    );
  };

  const handleCloseVerificationModal = () => {
    setIsVerificationModalOpen(false);
    setVerificationPaymentId(null);
  };

  // Poll for verification payment status when modal is open
  useEffect(() => {
    if (!verificationPaymentId || !isVerificationModalOpen) {
      return;
    }

    const pollVerificationStatus = async () => {
      if (isPollingRef.current) return; // Skip if already polling
      
      isPollingRef.current = true;
      try {
        const response = await fetch(`/api/admin/verification-payments/${verificationPaymentId}`);
        
        if (!response.ok) {
          return; // Continue polling
        }

        const data = await response.json();
        const verificationPayment = data.verificationPayment;

        if (!verificationPayment) {
          return;
        }

        // Check if verification completed
        if (verificationPayment.status === "completed") {
          // Close modal and refresh accounts
          handleCloseVerificationModal();
          
          if (verificationPayment.paymentAccount?.verificationLevel === "VERIFIED") {
            showToast(t("paymentAccount.messages.verificationComplete"), "success");
          } else {
            showToast(verificationPayment.errorMessage || t("paymentAccount.messages.verificationFailed"), "error");
          }
          
          // Refresh the accounts list
          await fetchAccounts();
        } else if (verificationPayment.status === "failed" || verificationPayment.status === "expired") {
          // Close modal and show error
          handleCloseVerificationModal();
          showToast(verificationPayment.errorMessage || t("paymentAccount.messages.verificationFailed"), "error");
          
          // Refresh the accounts list
          await fetchAccounts();
        }
      } catch (error) {
        console.error("Error polling verification status:", error);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial poll after 2 seconds
    const initialTimeout = setTimeout(pollVerificationStatus, 2000);

    // Poll every 3 seconds
    const pollInterval = setInterval(pollVerificationStatus, 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
    };
  // fetchAccounts is intentionally not in dependencies to prevent polling restart on its recreation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationPaymentId, isVerificationModalOpen, t]);

  if (isLoadingStore || (!orgId && !clubId)) {
    return <div className="im-loading">{t("common.loading")}</div>;
  }

  return (
    <div className="payment-accounts-page">
      <PageHeader
        title={t("paymentAccount.pageTitle.unified")}
        description={isOrgOwner ? organization?.name || "" : adminStatus?.assignedClub?.name || ""}
      />

      {error && <div className="im-error-banner">{error}</div>}

      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Payment Status for Club Admin */}
      {isClubAdmin && paymentStatus && (
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

      {/* Organization-level accounts (for org owners) */}
      {isOrgOwner && (
        <div className="payment-accounts-section">
          <h2 className="im-section-title">{t("paymentAccount.sections.organizationLevel")}</h2>
          <p className="im-section-description">{t("paymentAccount.sections.organizationDescription")}</p>
          <PaymentAccountList
            accounts={organizationAccounts}
            loading={loading}
            onAdd={handleAddOrgAccount}
            onEdit={(account) => handleEditAccount(account)}
            onDisable={(account) => handleDisableAccount(account)}
            onRetry={(account) => handleRetryVerification(account)}
            onVerifyReal={(account) => handleVerifyReal(account)}
            canRetry={isOrgOwner}
            canVerifyReal={isOrgOwner}
            scope="ORGANIZATION"
            showScopeInfo={false}
            verifyingAccountId={verifyingAccountId}
          />
        </div>
      )}

      {/* Club-level accounts */}
      {clubAccounts.length > 0 && (
        <div className="payment-accounts-section">
          <h2 className="im-section-title">
            {isOrgOwner ? t("paymentAccount.sections.clubLevel") : t("paymentAccount.sections.yourClub")}
          </h2>
          {isOrgOwner && (
            <p className="im-section-description">{t("paymentAccount.sections.clubDescription")}</p>
          )}

          {clubAccounts.map((clubData) => (
            <div key={clubData.clubId} className="club-accounts-container">
              {isOrgOwner && (
                <button
                  className="club-header-toggle"
                  onClick={() => toggleClubExpanded(clubData.clubId)}
                  aria-expanded={clubData.isExpanded}
                >
                  <span className="club-toggle-icon">{clubData.isExpanded ? "▼" : "▶"}</span>
                  <h3 className="club-name">{clubData.clubName}</h3>
                  <span className="club-accounts-count">
                    {clubData.accounts.length} {clubData.accounts.length === 1 ? t("paymentAccount.list.account") : t("paymentAccount.list.accounts")}
                  </span>
                </button>
              )}

              {(clubData.isExpanded || isClubAdmin) && (
                <div className="club-accounts-content">
                  <PaymentAccountList
                    accounts={clubData.accounts}
                    loading={loading}
                    onAdd={() => handleAddClubAccount(clubData.clubId)}
                    onEdit={(account) => handleEditAccount(account, clubData.clubId)}
                    onDisable={(account) => handleDisableAccount(account, clubData.clubId)}
                    onRetry={(account) => handleRetryVerification(account, clubData.clubId)}
                    onVerifyReal={(account) => handleVerifyReal(account, clubData.clubId)}
                    canRetry={true}
                    canVerifyReal={true}
                    scope="CLUB"
                    showScopeInfo
                    verifyingAccountId={verifyingAccountId}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PaymentAccountForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        account={selectedAccount}
        mode={formMode}
        scope={selectedScope}
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

      {/* Verification Payment Modal */}
      <Modal
        isOpen={isVerificationModalOpen}
        onClose={handleCloseVerificationModal}
        title={t("paymentAccount.verificationModal.title")}
      >
        <div className="verification-modal-content">
          <div className="verification-modal-instructions">
            <div className="verification-modal-icon">💳</div>
            <h3 className="verification-modal-heading">
              {t("paymentAccount.verificationModal.windowOpened")}
            </h3>
            <p className="verification-modal-description">
              {t("paymentAccount.verificationModal.description")}
            </p>
            <div className="verification-modal-steps">
              <div className="verification-step">
                <span className="verification-step-number">1</span>
                <span className="verification-step-text">
                  {t("paymentAccount.verificationModal.step1")}
                </span>
              </div>
              <div className="verification-step">
                <span className="verification-step-number">2</span>
                <span className="verification-step-text">
                  {t("paymentAccount.verificationModal.step2")}
                </span>
              </div>
              <div className="verification-step">
                <span className="verification-step-number">3</span>
                <span className="verification-step-text">
                  {t("paymentAccount.verificationModal.step3")}
                </span>
              </div>
            </div>
            <div className="verification-modal-status">
              <div className="verification-modal-spinner"></div>
              <p className="verification-modal-status-text">
                {t("paymentAccount.verificationModal.waitingForPayment")}
              </p>
            </div>
          </div>
          <p className="im-helper-text verification-modal-hint">
            {t("paymentAccount.verificationModal.hint")}
          </p>
        </div>
      </Modal>
    </div>
  );
}
