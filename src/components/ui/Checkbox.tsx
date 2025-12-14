"use client";

import { useId } from "react";
import "./Checkbox.css";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Checkbox({ label, className = "", id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className="rsp-checkbox-wrapper">
      <label className="rsp-checkbox-label">
        <input
          id={checkboxId}
          type="checkbox"
          className={`rsp-checkbox ${className}`.trim()}
          {...props}
        />
        {label && <span className="rsp-checkbox-text">{label}</span>}
      </label>
    </div>
  );
}
