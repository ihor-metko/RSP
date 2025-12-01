import { useState, useRef, useEffect } from "react";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  label?: string;
  className?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  placeholder = "Оберіть...",
  value,
  onChange,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(value!);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (!disabled) setOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    if (disabled) return;

    setSelected(optionValue);
    onChange?.(optionValue);
    setOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = () => {
    if (selected) return options.find((o) => o.value === selected)?.label;
    return placeholder;
  };

  return (
    <div className="im-select-wrapper" ref={wrapperRef}>
      {label && <label className="im-label mb-1 block text-sm font-medium">{label}</label>}
      <div
        className={`im-select-display ${disabled ? "im-disabled" : ""}`}
        onClick={toggleOpen}
      >
        {displayLabel()}
        <span className={`im-arrow ${open ? "im-open" : ""}`} />
      </div>
      {open && (
        <ul className="im-select-options">
          {options.map((option) => (
            <li
              key={option.value}
              className={`im-select-option ${selected === option.value ? "im-selected" : ""} ${option.disabled ? "im-disabled" : ""}`}
              onClick={() => !option.disabled && handleSelect(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
