import "./Input.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="rsp-input-wrapper">
      {label && (
        <label
          htmlFor={inputId}
          className="rsp-label mb-1 block text-sm font-medium"
        >
          {label}
        </label>
      )}
      <input id={inputId} className={`rsp-input ${className}`.trim()} {...props} />
    </div>
  );
}
