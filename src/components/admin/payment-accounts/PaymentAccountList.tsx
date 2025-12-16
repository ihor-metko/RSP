"use client";

import { useTranslations } from "next-intl";
import { Button, Table, Badge } from "@/components/ui";
import type { TableColumn } from "@/components/ui/Table";
import { MaskedPaymentAccount, PaymentAccountStatus } from "@/types/paymentAccount";
import "./PaymentAccountList.css";

interface PaymentAccountListProps {
  accounts: MaskedPaymentAccount[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (account: MaskedPaymentAccount) => void;
  onDisable: (account: MaskedPaymentAccount) => void;
  onRetry?: (account: MaskedPaymentAccount) => void;
  scope: "ORGANIZATION" | "CLUB";
  showScopeInfo?: boolean;
  canRetry?: boolean; // Whether user has permission to retry verification
}

export function PaymentAccountList({
  accounts,
  loading,
  onAdd,
  onEdit,
  onDisable,
  onRetry,
  scope,
  showScopeInfo = false,
  canRetry = false,
}: PaymentAccountListProps) {
  const t = useTranslations("paymentAccount");

  // Helper to get badge variant based on verification status
  const getStatusVariant = (status: PaymentAccountStatus): "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case PaymentAccountStatus.ACTIVE:
        return "success";
      case PaymentAccountStatus.PENDING:
        return "warning";
      case PaymentAccountStatus.INVALID:
        return "danger";
      case PaymentAccountStatus.DISABLED:
        return "default";
      default:
        return "default";
    }
  };

  // Helper to get status display text
  const getStatusText = (status: PaymentAccountStatus): string => {
    switch (status) {
      case PaymentAccountStatus.ACTIVE:
        return t("verificationStatus.active");
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
      header: t("table.verificationStatus"),
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
      key: "lastUpdated",
      header: t("table.lastUpdated"),
      render: (account) => new Date(account.lastUpdated).toLocaleDateString(),
    },
    {
      key: "actions",
      header: t("table.actions"),
      render: (account) => (
        <div className="im-table-actions">
          <Button size="small" variant="outline" onClick={() => onEdit(account)}>
            {t("actions.edit")}
          </Button>
          {account.status === PaymentAccountStatus.INVALID && canRetry && onRetry && (
            <Button size="small" variant="primary" onClick={() => onRetry(account)}>
              {t("actions.retryVerification")}
            </Button>
          )}
          {account.status === PaymentAccountStatus.ACTIVE && (
            <Button size="small" variant="danger" onClick={() => onDisable(account)}>
              {t("actions.disable")}
            </Button>
          )}
        </div>
      ),
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
