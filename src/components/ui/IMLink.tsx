import Link, { LinkProps } from "next/link";
import "./IMLink.css";

interface IMLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  children: React.ReactNode;
  className?: string;
}

export function IMLink({ href, children, className = "", ...props }: IMLinkProps) {
  return (
    <Link href={href} className={`im-link ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}
