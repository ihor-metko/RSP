import Link, { LinkProps } from "next/link";
import "./IMLink.css";

interface IMLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  asButton?: boolean;
  variant?: "primary" | "outline" | "danger";
  size?: "small" | "medium";
}

export function IMLink({ 
  href, 
  children, 
  className = "", 
  asButton = false,
  variant = "primary",
  size = "medium",
  ...props 
}: IMLinkProps) {
  // If asButton is true, use button styles from rsp-button
  const buttonClass = asButton ? "im-link--button" : "im-link";
  const variantClass = asButton && variant === "outline" 
    ? "im-link--button-outline" 
    : asButton && variant === "danger" 
    ? "im-link--button-danger" 
    : "";
  const sizeClass = asButton && size === "small" ? "im-link--button-small" : "";
  
  const linkClassName = `${buttonClass} ${variantClass} ${sizeClass} ${className}`.trim();
  
  return (
    <Link href={href} className={linkClassName} {...props}>
      {children}
    </Link>
  );
}
