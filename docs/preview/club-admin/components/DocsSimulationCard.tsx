"use client";

/**
 * DocsSimulationCard Component
 * Displays a simulation card for interactive documentation flows.
 * Used to showcase club admin role functionality in a demo environment.
 */
interface DocsSimulationCardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function DocsSimulationCard({
  title,
  description,
  children,
}: DocsSimulationCardProps) {
  return (
    <div className="im-card">
      {title && <h3 className="im-card-title">{title}</h3>}
      {description && <p className="im-text-muted">{description}</p>}
      {children}
    </div>
  );
}
