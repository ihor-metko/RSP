"use client";

import { forwardRef } from "react";
import { Input } from "./Input";

interface ImAuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showPasswordToggle?: boolean;
}

/**
 * ImAuthInput Component
 *
 * A specialized input component for authentication pages that applies
 * consistent auth-specific styling (im-auth-input class) while maintaining
 * all functionality from the base Input component.
 *
 * Features:
 * - Automatic application of im-auth-input styling
 * - Password toggle support for password fields
 * - Full compatibility with all standard input props
 * - Consistent with dark theme and authentication page design
 *
 * Note: This component intentionally does not expose the `label` prop from the base
 * Input component, as auth pages use separate <label> elements for layout flexibility.
 * The im-auth-input class is applied alongside rsp-input (from Input component),
 * with im-auth-input taking precedence via CSS cascade for auth-specific styling.
 */
export const ImAuthInput = forwardRef<HTMLInputElement, ImAuthInputProps>(
  function ImAuthInput({ className = "", showPasswordToggle = false, ...props }, ref) {
    // Ensure im-auth-input class is always applied
    // Split by whitespace and check for exact match to avoid false positives
    const classNames = className.split(/\s+/).filter(Boolean);
    const hasAuthClass = classNames.includes("im-auth-input");
    const authClassName = hasAuthClass
      ? className
      : `im-auth-input ${className}`.trim();

    return (
      <Input
        ref={ref}
        className={authClassName}
        showPasswordToggle={showPasswordToggle}
        {...props}
      />
    );
  }
);
