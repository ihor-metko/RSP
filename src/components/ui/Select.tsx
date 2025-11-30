import "./Select.css";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string | string[]) => void;
}

export function Select({
  label,
  options,
  placeholder,
  className = "",
  id,
  multiple,
  value,
  onChange,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onChange) return;
    
    if (multiple) {
      const selectedValues = Array.from(e.target.selectedOptions).map(opt => opt.value);
      onChange(selectedValues);
    } else {
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
        multiple={multiple}
        value={value}
        onChange={handleChange}
        {...props}
      >
        {placeholder && !multiple && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
