// Constants for price conversion
export const CENTS_PER_DOLLAR = 100;

/**
 * Format a price in cents to a user-friendly dollar string
 * @param priceInCents - The price in cents
 * @returns Formatted price string (e.g., "$50.00")
 */
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / CENTS_PER_DOLLAR).toFixed(2)}`;
}

/**
 * Convert a dollar amount to cents
 * @param dollars - The price in dollars
 * @returns Price in cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

/**
 * Convert a cents amount to dollars
 * @param cents - The price in cents
 * @returns Price in dollars
 */
export function centsToDollars(cents: number): number {
  return cents / CENTS_PER_DOLLAR;
}
