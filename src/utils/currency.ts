/**
 * Currency utility for global currency handling
 * 
 * Provides centralized currency formatting and conversion logic
 * with support for multiple currencies and their specific rules.
 */

export enum Currency {
  UAH = "UAH",
  USD = "USD",
  EUR = "EUR",
}

/**
 * Currency configuration defining formatting rules
 */
interface CurrencyConfig {
  code: Currency;
  symbol: string;
  decimalPlaces: number;
  centsPerUnit: number;
}

/**
 * Currency configurations with specific formatting rules
 */
const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  [Currency.UAH]: {
    code: Currency.UAH,
    symbol: "₴",
    decimalPlaces: 0, // UAH doesn't show coins
    centsPerUnit: 100,
  },
  [Currency.USD]: {
    code: Currency.USD,
    symbol: "$",
    decimalPlaces: 2,
    centsPerUnit: 100,
  },
  [Currency.EUR]: {
    code: Currency.EUR,
    symbol: "€",
    decimalPlaces: 2,
    centsPerUnit: 100,
  },
};

/**
 * Get currency configuration
 */
function getCurrencyConfig(currency: Currency): CurrencyConfig {
  return CURRENCY_CONFIGS[currency];
}

/**
 * Format a price in cents to a user-friendly string with currency symbol
 * 
 * @param priceInCents - The price in cents (smallest currency unit)
 * @param currency - The currency code (defaults to UAH)
 * @returns Formatted price string with currency symbol
 * 
 * @example
 * formatCurrency(5000, Currency.UAH) // "₴50"
 * formatCurrency(5000, Currency.USD) // "$50.00"
 * formatCurrency(5050, Currency.EUR) // "€50.50"
 */
export function formatCurrency(
  priceInCents: number,
  currency: Currency = Currency.UAH
): string {
  const config = getCurrencyConfig(currency);
  const amount = priceInCents / config.centsPerUnit;
  
  // Format according to currency-specific decimal places
  const formattedAmount = config.decimalPlaces === 0
    ? Math.round(amount).toString()
    : amount.toFixed(config.decimalPlaces);
  
  return `${config.symbol}${formattedAmount}`;
}

/**
 * Convert a currency amount to cents
 * 
 * @param amount - The amount in the main currency unit
 * @param currency - The currency code (defaults to UAH)
 * @returns Amount in cents
 * 
 * @example
 * toCents(50, Currency.UAH) // 5000
 * toCents(50.50, Currency.USD) // 5050
 */
export function toCents(
  amount: number,
  currency: Currency = Currency.UAH
): number {
  const config = getCurrencyConfig(currency);
  return Math.round(amount * config.centsPerUnit);
}

/**
 * Convert cents to currency amount
 * 
 * @param cents - The amount in cents
 * @param currency - The currency code (defaults to UAH)
 * @returns Amount in the main currency unit
 * 
 * @example
 * fromCents(5000, Currency.UAH) // 50
 * fromCents(5050, Currency.USD) // 50.50
 */
export function fromCents(
  cents: number,
  currency: Currency = Currency.UAH
): number {
  const config = getCurrencyConfig(currency);
  return cents / config.centsPerUnit;
}

/**
 * Parse a currency string to its enum value
 * 
 * @param currencyStr - Currency string (e.g., "UAH", "USD", "EUR")
 * @returns Currency enum value or UAH as default
 */
export function parseCurrency(currencyStr: string | null | undefined): Currency {
  if (!currencyStr) {
    return Currency.UAH;
  }
  
  const upperStr = currencyStr.toUpperCase();
  if (upperStr in Currency) {
    return Currency[upperStr as keyof typeof Currency];
  }
  
  return Currency.UAH;
}

/**
 * Get the currency symbol for a given currency
 * 
 * @param currency - The currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return getCurrencyConfig(currency).symbol;
}

/**
 * Get the decimal places for a given currency
 * 
 * @param currency - The currency code
 * @returns Number of decimal places
 */
export function getCurrencyDecimalPlaces(currency: Currency): number {
  return getCurrencyConfig(currency).decimalPlaces;
}
