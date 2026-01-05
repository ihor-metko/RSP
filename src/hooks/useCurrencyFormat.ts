"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency, Currency } from "@/utils/currency";
import { useCallback } from "react";

/**
 * useCurrencyFormat - Hook for formatting prices with current global currency
 * 
 * Provides a convenient way to format prices using the current currency context.
 * Automatically uses the global currency setting from CurrencyProvider.
 * 
 * @returns Object with currency and format function
 * 
 * @example
 * // In a component
 * const { currency, formatPrice } = useCurrencyFormat();
 * 
 * // Format a price with current currency
 * const formatted = formatPrice(5000); // Uses current currency from context
 * 
 * // Override currency if needed
 * const formattedUSD = formatPrice(5000, Currency.USD);
 */
export function useCurrencyFormat() {
  const { currency } = useCurrency();

  const formatPrice = useCallback(
    (priceInCents: number, currencyOverride?: Currency): string => {
      return formatCurrency(priceInCents, currencyOverride ?? currency);
    },
    [currency]
  );

  return {
    currency,
    formatPrice,
  };
}
