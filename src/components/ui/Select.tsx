import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function Select({
  label,
  options,
  placeholder,
  className = "",
  id,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="rsp-select-wrapper">
      {label && (
        <label
          htmlFor={selectId}
          className="rsp-label mb-1 block text-sm font-medium"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`rsp-select ${className}`.trim()}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel || (!label ? undefined : undefined)}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
