interface AdminListLoadingProps {
  message?: string;
}

/**
 * Reusable loading state for admin list pages
 * 
 * @example
 * ```tsx
 * <AdminListLoading message={t("common.loading")} />
 * ```
 */
export function AdminListLoading({ message = "Loading..." }: AdminListLoadingProps) {
  return (
    <div className="im-admin-loading">
      <div className="im-admin-loading-spinner" />
      <span className="im-admin-loading-text">{message}</span>
    </div>
  );
}
