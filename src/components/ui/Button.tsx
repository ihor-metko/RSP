import "./Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const variantClass = variant === "outline" ? "rsp-button--outline" : "";

  return (
    <button
      className={`rsp-button ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
