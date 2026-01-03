"use client";

import { useTranslations } from "next-intl";
import { Button, Table, Badge } from "@/components/ui";
import type { TableColumn } from "@/components/ui/Table";
import { MaskedPaymentAccount, PaymentAccountStatus, PaymentAccountVerificationLevel } from "@/types/paymentAccount";
import "./PaymentAccountList.css";

interface PaymentAccountListProps {
  accounts: MaskedPaymentAccount[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (account: MaskedPaymentAccount) => void;
  onDisable: (account: MaskedPaymentAccount) => void;
  onRetry?: (account: MaskedPaymentAccount) => void;
  onVerifyReal?: (account: MaskedPaymentAccount) => void; // Initiate real payment verification
  scope: "ORGANIZATION" | "CLUB";
  showScopeInfo?: boolean;
  canRetry?: boolean; // Whether user has permission to retry verification
  canVerifyReal?: boolean; // Whether user can initiate real payment verification
  verifyingAccountId?: string | null; // ID of account currently being verified
}

export function PaymentAccountList({
  accounts,
  loading,
  onAdd,
  onEdit,
  onDisable,
  onRetry,
  onVerifyReal,
  scope,
  showScopeInfo = false,
  canRetry = false,
  canVerifyReal = false,
  verifyingAccountId = null,
}: PaymentAccountListProps) {
  const t = useTranslations("paymentAccount");

  // Helper to get badge variant based on technical verification status
  const getStatusVariant = (status: PaymentAccountStatus): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case PaymentAccountStatus.VERIFIED:
        return "success";
      case PaymentAccountStatus.TECHNICAL_OK:
        return "success";
      case PaymentAccountStatus.PENDING:
        return "warning";
      case PaymentAccountStatus.INVALID:
        return "error";
      case PaymentAccountStatus.DISABLED:
        return "default";
      default:
        return "default";
    }
  };

  // Helper to get status display text
  const getStatusText = (status: PaymentAccountStatus): string => {
    switch (status) {
      case PaymentAccountStatus.VERIFIED:
        return t("verificationStatus.verified");
      case PaymentAccountStatus.TECHNICAL_OK:
        return t("verificationStatus.technicalOk");
      case PaymentAccountStatus.PENDING:
        return t("verificationStatus.pending");
      case PaymentAccountStatus.INVALID:
        return t("verificationStatus.invalid");
      case PaymentAccountStatus.DISABLED:
        return t("verificationStatus.disabled");
      default:
        return status;
    }
  };

  // Helper to get verification level badge variant
  const getVerificationLevelVariant = (level: PaymentAccountVerificationLevel): "success" | "warning" => {
    return level === PaymentAccountVerificationLevel.VERIFIED ? "success" : "warning";
  };

  // Helper to get verification level display text
  const getVerificationLevelText = (level: PaymentAccountVerificationLevel): string => {
    return level === PaymentAccountVerificationLevel.VERIFIED
      ? t("verificationLevel.verified")
      : t("verificationLevel.notVerified");
  };

  const columns: TableColumn<MaskedPaymentAccount>[] = [
    {
      key: "provider",
      header: t("table.provider"),
      render: (account) => <span className="im-provider-badge">{account.provider}</span>,
    },
    {
      key: "displayName",
      header: t("table.displayName"),
      render: (account) => account.displayName || <span className="im-text-muted">—</span>,
    },
    {
      key: "scope",
      header: t("table.scope"),
      render: (account) => (
        <Badge
          variant={account.scope === "CLUB" ? "success" : "default"}
          className="im-scope-badge"
        >
          {t(`scope.${account.scope.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("table.technicalStatus"),
      render: (account) => (
        <div className="im-status-cell">
          <Badge variant={getStatusVariant(account.status)}>
            {getStatusText(account.status)}
          </Badge>
          {account.status === PaymentAccountStatus.INVALID && account.verificationError && (
            <span className="im-error-hint" title={account.verificationError}>
              ⚠️
            </span>
          )}
        </div>
      ),
    },
    {
      key: "verificationLevel",
      header: t("table.verificationLevel"),
      render: (account) => (
        <div className="im-verification-level-cell">
          <Badge variant={getVerificationLevelVariant(account.verificationLevel)}>
            {account.verificationLevel === PaymentAccountVerificationLevel.VERIFIED ? "🟢" : "🟡"}{" "}
            {getVerificationLevelText(account.verificationLevel)}
          </Badge>
          {account.verificationLevel === PaymentAccountVerificationLevel.NOT_VERIFIED && (
            <span className="im-helper-text" title={t("verificationLevel.helpText")}>
              ℹ️
            </span>
          )}
        </div>
      ),
    },
    {
      key: "lastUpdated",
      header: t("table.lastUpdated"),
      render: (account) => new Date(account.lastUpdated).toLocaleDateString(),
    },
    {
      key: "actions",
      header: t("table.actions"),
      render: (account) => {
        const isVerifying = verifyingAccountId === account.id;
        
        return (
          <div className="im-table-actions">
            <Button size="small" variant="outline" onClick={() => onEdit(account)} disabled={isVerifying}>
              {t("actions.edit")}
            </Button>
            {/* Show "Verify Payment Account" button if not verified and technically OK or pending */}
            {account.verificationLevel === PaymentAccountVerificationLevel.NOT_VERIFIED &&
              (account.status === PaymentAccountStatus.TECHNICAL_OK || account.status === PaymentAccountStatus.PENDING) &&
              canVerifyReal &&
              onVerifyReal && (
                <div className="im-verification-button-wrapper">
                  <Button 
                    size="small" 
                    variant="primary" 
                    onClick={() => onVerifyReal(account)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <span className="im-button-content">
                        <span className="im-button-spinner-small" />
                        {t("actions.verifying")}
                      </span>
                    ) : (
                      t("actions.verifyReal")
                    )}
                  </Button>
                  {isVerifying && (
                    <span className="im-helper-text-small">
                      {t("messages.verificationInProgress")}
                    </span>
                  )}
                </div>
              )}
            {/* Show "Retry Technical Verification" button if invalid */}
            {account.status === PaymentAccountStatus.INVALID && canRetry && onRetry && (
              <Button size="small" variant="primary" onClick={() => onRetry(account)} disabled={isVerifying}>
                {t("actions.retryVerification")}
              </Button>
            )}
            {/* Show disable button only for verified accounts */}
            {account.verificationLevel === PaymentAccountVerificationLevel.VERIFIED && (
              <Button size="small" variant="danger" onClick={() => onDisable(account)} disabled={isVerifying}>
                {t("actions.disable")}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="payment-account-list">
      {showScopeInfo && (
        <div className="im-info-banner">
          <div className="im-info-icon">ℹ️</div>
          <div className="im-info-content">
            <h4>{t("priorityInfo.title")}</h4>
            <p>
              {scope === "CLUB"
                ? t("priorityInfo.clubPriority")
                : t("priorityInfo.organizationFallback")}
            </p>
          </div>
        </div>
      )}

      <div className="im-list-header">
        <div className="im-list-header-left">
          <h3>{t("list.title")}</h3>
          <span className="im-list-count">
            {accounts.length} {accounts.length === 1 ? t("list.account") : t("list.accounts")}
          </span>
        </div>
        <Button variant="primary" onClick={onAdd}>
          {t("actions.add")}
        </Button>
      </div>

      <Table<MaskedPaymentAccount>
        columns={columns}
        data={accounts}
        keyExtractor={(account) => account.id}
        loading={loading}
        emptyMessage={t("list.empty")}
        ariaLabel={t("list.ariaLabel")}
      />
    </div>
  );
}
