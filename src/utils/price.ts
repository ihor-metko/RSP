import { formatCurrency, toCents, fromCents, Currency } from "./currency";

// Constants for price conversion (kept for backward compatibility)
export const CENTS_PER_DOLLAR = 100;

/**
 * Format a price in cents to a user-friendly string with currency symbol
 * 
 * @param priceInCents - The price in cents
 * @param currency - The currency code (defaults to UAH for new global system)
 * @returns Formatted price string (e.g., "₴50" for UAH, "$50.00" for USD)
 * 
 * @example
 * formatPrice(5000) // "₴50" (UAH default, no coins)
 * formatPrice(5000, Currency.USD) // "$50.00"
 * formatPrice(5050, Currency.EUR) // "€50.50"
 */
export function formatPrice(priceInCents: number, currency?: Currency): string {
  return formatCurrency(priceInCents, currency);
}

/**
 * Convert a dollar amount to cents
 * @deprecated Use toCents from currency.ts instead
 * @param dollars - The price in dollars
 * @returns Price in cents
 */
export function dollarsToCents(dollars: number): number {
  return toCents(dollars, Currency.USD);
}

/**
 * Convert a cents amount to dollars
 * @deprecated Use fromCents from currency.ts instead
 * @param cents - The price in cents
 * @returns Price in dollars
 */
export function centsToDollars(cents: number): number {
  return fromCents(cents, Currency.USD);
}

// Re-export currency utilities for convenience
export { Currency, formatCurrency, toCents, fromCents, parseCurrency, getCurrencySymbol, getCurrencyDecimalPlaces } from "./currency";
