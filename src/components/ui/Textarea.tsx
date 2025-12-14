"use client";

import "./Textarea.css";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="rsp-textarea-wrapper">
      {label && (
        <label
          htmlFor={textareaId}
          className="rsp-label mb-1 block text-sm font-medium"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`rsp-textarea ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
