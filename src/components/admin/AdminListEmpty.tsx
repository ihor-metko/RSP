import { Card } from "@/components/ui";
import { ReactNode } from "react";

interface AdminListEmptyProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

/**
 * Reusable empty state for admin list pages
 * 
 * @example
 * ```tsx
 * <AdminListEmpty
 *   icon={<UserIcon />}
 *   title={t("users.noUsers")}
 *   description={t("users.noUsersDescription")}
 * />
 * ```
 */
export function AdminListEmpty({ icon, title, description }: AdminListEmptyProps) {
  return (
    <Card className="im-empty-state">
      <div className="im-empty-state-icon">{icon}</div>
      <h3 className="im-empty-state-title">{title}</h3>
      {description && <p className="im-empty-state-description">{description}</p>}
    </Card>
  );
}
