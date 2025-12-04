import "./Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger";
  size?: "small" | "medium";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "medium",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const variantClass = variant === "outline" 
    ? "rsp-button--outline" 
    : variant === "danger" 
    ? "rsp-button--danger" 
    : "";
  const sizeClass = size === "small" ? "rsp-button--small" : "";

  return (
    <button
      className={`rsp-button ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
