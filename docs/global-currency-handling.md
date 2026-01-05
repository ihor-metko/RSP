# Global Currency Handling System

## Overview

The ArenaOne platform now has a centralized, flexible currency handling system that supports multiple currencies with their specific formatting rules. The system is designed to be easily extensible for new currencies in the future.

## Key Features

- **Centralized Currency Logic**: All currency formatting and conversion is handled through a single utility (`src/utils/currency.ts`)
- **Context-based Global State**: Currency preferences are managed globally via React Context (`src/contexts/CurrencyContext.tsx`)
- **Special Currency Rules**: Each currency can have its own formatting rules (e.g., UAH doesn't show decimal places)
- **Backward Compatible**: Existing `formatPrice()` function still works but now defaults to UAH
- **Type-safe**: Full TypeScript support with proper enums and type guards

## Supported Currencies

| Currency | Code | Symbol | Decimal Places | Example |
|----------|------|--------|----------------|---------|
| Ukrainian Hryvnia | UAH | ₴ | 0 (no coins) | ₴50 |
| US Dollar | USD | $ | 2 | $50.00 |
| Euro | EUR | € | 2 | €50.50 |

## Usage

### Basic Usage (Components)

For most components, you can use the existing `formatPrice` function which now defaults to UAH:

```typescript
import { formatPrice } from "@/utils/price";

// Format with default currency (UAH)
const formatted = formatPrice(5000); // "₴50"

// Format with specific currency
const formattedUSD = formatPrice(5000, Currency.USD); // "$50.00"
const formattedEUR = formatPrice(5000, Currency.EUR); // "€50.00"
```

### Using Currency Context (Recommended for New Components)

For components that need to be currency-aware and respect global currency settings:

```typescript
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency } from "@/utils/currency";

function MyComponent() {
  const { currency, setCurrency } = useCurrency();
  
  // Format with current global currency
  const price = formatCurrency(5000, currency); // Uses global currency
  
  // Change global currency (e.g., when user selects a club)
  useEffect(() => {
    if (club?.defaultCurrency) {
      setCurrencyFromString(club.defaultCurrency);
    }
  }, [club]);
  
  return <div>{price}</div>;
}
```

### Using the Convenience Hook

For the simplest approach in components:

```typescript
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

function MyComponent() {
  const { currency, formatPrice } = useCurrencyFormat();
  
  // Automatically uses current global currency
  return <div>{formatPrice(5000)}</div>;
}
```

### Setting Up the Provider

Add the `CurrencyProvider` at the root of your application (or layout):

```typescript
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Currency } from "@/utils/currency";

export default function RootLayout({ children }) {
  return (
    <CurrencyProvider initialCurrency={Currency.UAH}>
      {children}
    </CurrencyProvider>
  );
}
```

## API Reference

### `formatCurrency(priceInCents, currency?)`

Formats a price in cents according to currency-specific rules.

**Parameters:**
- `priceInCents` (number): Price in smallest currency unit (cents)
- `currency` (Currency, optional): Currency to format in. Defaults to UAH.

**Returns:** Formatted price string with currency symbol

**Examples:**
```typescript
formatCurrency(5000, Currency.UAH)  // "₴50"
formatCurrency(5050, Currency.UAH)  // "₴51" (rounded)
formatCurrency(5000, Currency.USD)  // "$50.00"
formatCurrency(5050, Currency.USD)  // "$50.50"
```

### `toCents(amount, currency?)`

Converts currency amount to cents.

**Parameters:**
- `amount` (number): Amount in main currency unit
- `currency` (Currency, optional): Currency type. Defaults to UAH.

**Returns:** Amount in cents

**Examples:**
```typescript
toCents(50, Currency.UAH)    // 5000
toCents(50.50, Currency.USD) // 5050
```

### `fromCents(cents, currency?)`

Converts cents to currency amount.

**Parameters:**
- `cents` (number): Amount in cents
- `currency` (Currency, optional): Currency type. Defaults to UAH.

**Returns:** Amount in main currency unit

**Examples:**
```typescript
fromCents(5000, Currency.UAH) // 50
fromCents(5050, Currency.USD) // 50.50
```

### `parseCurrency(currencyStr)`

Parses a currency string to Currency enum.

**Parameters:**
- `currencyStr` (string | null | undefined): Currency code string

**Returns:** Currency enum value (defaults to UAH if invalid)

**Examples:**
```typescript
parseCurrency("USD")     // Currency.USD
parseCurrency("uah")     // Currency.UAH (case-insensitive)
parseCurrency("invalid") // Currency.UAH (default)
```

## UAH Special Rule

Ukrainian Hryvnia (UAH) is formatted **without decimal places** (no coins). This means:

- `5000 cents` → `"₴50"` (not `"₴50.00"`)
- `5050 cents` → `"₴51"` (rounded up)
- `5025 cents` → `"₴50"` (rounded down)

This follows the standard practice in Ukraine where prices are typically displayed in whole hryvnias.

## Adding New Currencies

To add support for a new currency:

1. Add the currency to the `Currency` enum in `src/utils/currency.ts`
2. Add its configuration to `CURRENCY_CONFIGS` with:
   - `code`: Currency enum value
   - `symbol`: Currency symbol to display
   - `decimalPlaces`: Number of decimal places (0 for no coins)
   - `centsPerUnit`: How many cents in one unit (typically 100)

**Example:**
```typescript
export enum Currency {
  UAH = "UAH",
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP", // New currency
}

const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  // ... existing configs
  [Currency.GBP]: {
    code: Currency.GBP,
    symbol: "£",
    decimalPlaces: 2,
    centsPerUnit: 100,
  },
};
```

No changes to components are needed - they will automatically support the new currency!

## Backward Compatibility

The existing `formatPrice()`, `dollarsToCents()`, and `centsToDollars()` functions in `src/utils/price.ts` continue to work:

- `formatPrice()` now defaults to UAH instead of USD
- To get old USD behavior: `formatPrice(5000, Currency.USD)`
- `dollarsToCents()` and `centsToDollars()` still work for USD conversions

## Testing

All currency functionality is fully tested:

- `src/__tests__/currency.test.ts` - Core currency utilities
- `src/__tests__/CurrencyContext.test.tsx` - Currency context and provider
- `src/__tests__/price-backward-compatibility.test.ts` - Backward compatibility

Run tests with:
```bash
npm test -- currency
```

## Migration Guide

For existing components:

1. **No changes needed** if you're okay with UAH as default
2. **For USD formatting**: Add `Currency.USD` as second parameter to `formatPrice()`
3. **For club-specific currency**: Use the context to set currency based on `club.defaultCurrency`

**Example migration:**
```typescript
// Before
const price = formatPrice(5000); // Was "$50.00"

// After - Option 1: Accept UAH default
const price = formatPrice(5000); // Now "₴50"

// After - Option 2: Explicitly use USD
const price = formatPrice(5000, Currency.USD); // "$50.00"

// After - Option 3: Use context for dynamic currency
const { currency } = useCurrency();
const price = formatCurrency(5000, currency);
```

## Best Practices

1. **Use the context** for components that display prices from clubs with different currencies
2. **Set currency at the club/organization level** when entering a club-specific view
3. **Use UAH as default** since it's the primary currency for the platform
4. **Explicitly specify currency** when you need a specific one regardless of context
5. **Test with different currencies** to ensure formatting works correctly

## Future Enhancements

Potential future improvements:

- Locale-based number formatting (thousands separators)
- Right-to-left currency symbol placement for certain locales
- Currency conversion/exchange rates
- User preference for currency display
- Multi-currency pricing (show equivalent prices)
