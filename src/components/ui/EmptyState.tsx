import "./EmptyState.css";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, className = "" }: EmptyStateProps) {
  return (
    <div className={`im-empty-state ${className}`}>
      {icon && <div className="im-empty-state-icon">{icon}</div>}
      <h3 className="im-empty-state-title">{title}</h3>
      <p className="im-empty-state-description">{description}</p>
    </div>
  );
}
