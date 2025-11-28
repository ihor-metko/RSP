import "./Card.css";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Card({ title, children, footer, className = "" }: CardProps) {
  return (
    <div className={`rsp-card ${className}`.trim()}>
      {title && <div className="rsp-card-header">{title}</div>}
      <div className="rsp-card-body">{children}</div>
      {footer && <div className="rsp-card-footer">{footer}</div>}
    </div>
  );
}
