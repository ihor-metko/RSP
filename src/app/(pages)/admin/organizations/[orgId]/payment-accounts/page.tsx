"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Breadcrumbs, ConfirmationModal } from "@/components/ui";
import { PaymentAccountList } from "@/components/admin/payment-accounts/PaymentAccountList";
import { PaymentAccountForm, PaymentAccountFormData } from "@/components/admin/payment-accounts/PaymentAccountForm";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import type { MaskedPaymentAccount } from "@/types/paymentAccount";
import "./page.css";

export default function OrganizationPaymentAccountsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [orgId, setOrgId] = useState<string | null>(null);
  
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const user = useUserStore((state) => state.user);
  
  const organizations = useOrganizationStore((state) => state.organizations);
  const fetchOrganizations = useOrganizationStore((state) => state.fetchOrganizations);
  
  const [accounts, setAccounts] = useState<MaskedPaymentAccount[]>([]);
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
      setOrgId(resolvedParams.orgId);
    });
  }, [params]);

  // Fetch organization name
  useEffect(() => {
    if (isLoggedIn && !isLoadingStore && organizations.length === 0) {
      fetchOrganizations();
    }
  }, [isLoggedIn, isLoadingStore, organizations.length, fetchOrganizations]);

  const organization = organizations.find((org) => org.id === orgId);

  // Authorization check
  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Only organization owners can manage organization-level payment accounts
    if (adminStatus?.isAdmin) {
      // Check if user is organization admin/owner for this org
      const isOrgOwner =
        adminStatus.adminType === "root_admin" ||
        (adminStatus.adminType === "organization_admin" && orgId !== null && adminStatus.managedIds.includes(orgId));

      if (!isOrgOwner) {
        router.push("/admin/dashboard");
        return;
      }
    } else {
      router.push("/auth/sign-in");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, orgId, router]);

  const fetchAccounts = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/payment-accounts`);
      if (!response.ok) {
        throw new Error("Failed to load payment accounts");
      }
      const data = await response.json();
      setAccounts(data.paymentAccounts || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load payment accounts";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId && isLoggedIn && !isLoadingStore) {
      fetchAccounts();
    }
  }, [orgId, isLoggedIn, isLoadingStore, fetchAccounts]);

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
    if (!orgId || !user) return;

    try {
      if (formMode === "add") {
        const response = await fetch(`/api/admin/organizations/${orgId}/payment-accounts`, {
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
          `/api/admin/organizations/${orgId}/payment-accounts/${selectedAccount.id}`,
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
    if (!accountToDisable || !orgId) return;

    try {
      const response = await fetch(
        `/api/admin/organizations/${orgId}/payment-accounts/${accountToDisable.id}`,
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

  if (isLoadingStore || !orgId) {
    return <div className="im-loading">Loading...</div>;
  }

  const breadcrumbs = [
    { label: t("admin.dashboard"), href: "/admin/dashboard" },
    { label: t("admin.organizations"), href: "/admin/organizations" },
    {
      label: organization?.name || t("admin.organization"),
      href: `/admin/organizations/${orgId}`,
    },
    { label: t("paymentAccount.breadcrumb"), href: "#" },
  ];

  return (
    <div className="payment-accounts-page">
      <Breadcrumbs items={breadcrumbs} />
      
      <PageHeader
        title={t("paymentAccount.pageTitle.organization")}
        description={organization?.name || ""}
      />

      {error && <div className="im-error-banner">{error}</div>}

      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <PaymentAccountList
        accounts={accounts}
        loading={loading}
        onAdd={handleAddAccount}
        onEdit={handleEditAccount}
        onDisable={handleDisableAccount}
        scope="ORGANIZATION"
        showScopeInfo
      />

      <PaymentAccountForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        account={selectedAccount}
        mode={formMode}
        scope="ORGANIZATION"
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
