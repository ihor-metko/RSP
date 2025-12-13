# Select Component

## Overview

The `Select` component is a fully accessible, keyboard-navigable dropdown select component built with React. It follows the WAI-ARIA combobox pattern and provides a consistent UI across the application.

## Important: Controlled Component

**The Select component is a controlled component.** This means you must:

1. Provide a `value` prop (the current selected value)
2. Provide an `onChange` handler that updates the parent component's state

If you don't provide these props, the selection will not work!

## Basic Usage

```tsx
import { Select } from "@/components/ui";
import { useState } from "react";

function MyForm() {
  const [selectedValue, setSelectedValue] = useState("");

  return (
    <Select
      label="Choose an option"
      options={[
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
      ]}
      value={selectedValue}
      onChange={setSelectedValue}  // REQUIRED: Updates parent state
      placeholder="Select an option..."
    />
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `options` | `SelectOption[]` | Yes | - | Array of options to display |
| `value` | `string` | No | `undefined` | Current selected value (controlled) |
| `onChange` | `(value: string) => void` | No | `undefined` | Callback when value changes |
| `label` | `string` | No | `undefined` | Label text displayed above the select |
| `placeholder` | `string` | No | `"Select..."` | Placeholder text when no value is selected |
| `id` | `string` | No | auto-generated | HTML id attribute |
| `className` | `string` | No | `""` | Additional CSS classes |
| `disabled` | `boolean` | No | `false` | Whether the select is disabled |
| `required` | `boolean` | No | `false` | Whether the select is required |
| `aria-label` | `string` | No | `undefined` | ARIA label (used when `label` is not provided) |
| `aria-describedby` | `string` | No | `undefined` | ARIA describedby attribute |

### SelectOption Interface

```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}
```

## Examples

### With Pre-selected Value

```tsx
const [country, setCountry] = useState("us");

<Select
  label="Country"
  options={[
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
    { value: "ca", label: "Canada" },
  ]}
  value={country}
  onChange={setCountry}
/>
```

### With Icons

```tsx
const [status, setStatus] = useState("");

<Select
  label="Status"
  options={[
    { value: "active", label: "Active", icon: <span>✅</span> },
    { value: "pending", label: "Pending", icon: <span>⏳</span> },
    { value: "inactive", label: "Inactive", icon: <span>❌</span> },
  ]}
  value={status}
  onChange={setStatus}
/>
```

### With Disabled Options

```tsx
<Select
  label="Membership Level"
  options={[
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro (Coming Soon)", disabled: true },
    { value: "enterprise", label: "Enterprise (Coming Soon)", disabled: true },
  ]}
  value={membership}
  onChange={setMembership}
/>
```

### In a Form

```tsx
function BookingForm() {
  const [formData, setFormData] = useState({
    court: "",
    time: "",
  });

  const handleCourtChange = (value: string) => {
    setFormData(prev => ({ ...prev, court: value }));
  };

  return (
    <form>
      <Select
        label="Select Court"
        options={courts.map(court => ({
          value: court.id,
          label: court.name,
        }))}
        value={formData.court}
        onChange={handleCourtChange}
        required
      />
    </form>
  );
}
```

### With React Hook Form

```tsx
import { useForm, Controller } from "react-hook-form";

function MyForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <Select
            label="Category"
            options={categories}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </form>
  );
}
```

## Accessibility

The Select component follows WAI-ARIA best practices:

- Uses `role="combobox"` for the trigger
- Uses `role="listbox"` for the dropdown
- Uses `role="option"` for each option
- Properly manages `aria-expanded`, `aria-activedescendant`, and `aria-selected`
- Supports keyboard navigation:
  - `Enter` or `Space`: Open/close dropdown or select focused option
  - `ArrowDown`: Navigate to next option
  - `ArrowUp`: Navigate to previous option
  - `Home`: Jump to first option
  - `End`: Jump to last option
  - `Escape`: Close dropdown
  - `Tab`: Close dropdown and move to next focusable element

## Styling

The component uses semantic `im-*` classes for styling and automatically supports the application's dark theme.

Custom styling can be applied via the `className` prop:

```tsx
<Select
  className="my-custom-class"
  // ... other props
/>
```

## Common Mistakes

### ❌ Mistake: Not providing onChange handler

```tsx
// This WON'T work - selection will appear to do nothing!
const [value, setValue] = useState("");

<Select
  options={options}
  value={value}
  // Missing onChange!
/>
```

### ✅ Correct: Providing both value and onChange

```tsx
const [value, setValue] = useState("");

<Select
  options={options}
  value={value}
  onChange={setValue}  // ✅ Updates state
/>
```

### ❌ Mistake: onChange doesn't update state

```tsx
const [value, setValue] = useState("");

<Select
  options={options}
  value={value}
  onChange={(newValue) => {
    console.log(newValue);  // ❌ Only logs, doesn't update state!
  }}
/>
```

### ✅ Correct: onChange updates state

```tsx
const [value, setValue] = useState("");

<Select
  options={options}
  value={value}
  onChange={(newValue) => {
    console.log(newValue);
    setValue(newValue);  // ✅ Updates state
  }}
/>
```

## Development Mode Warning

In development mode, the component will log a warning to the console if you forget to provide an `onChange` handler:

```
Select component: 'onChange' prop is missing. This is a controlled component and requires an onChange handler to update the parent state. Selection will not work without it.
```

This warning helps developers catch this common mistake early.

## Related Components

- `Multiselect` - For selecting multiple values
- `Input` - For text input
- `DateInput` - For date selection

## Testing

When testing components that use Select, mock the component or provide proper value/onChange props:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "@/components/ui";

test("Select updates value", () => {
  const mockOnChange = jest.fn();
  
  render(
    <Select
      options={[{ value: "1", label: "Option 1" }]}
      value=""
      onChange={mockOnChange}
    />
  );

  fireEvent.click(screen.getByRole("combobox"));
  fireEvent.click(screen.getByRole("option", { name: "Option 1" }));

  expect(mockOnChange).toHaveBeenCalledWith("1");
});
```
