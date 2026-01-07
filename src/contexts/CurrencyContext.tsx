"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Currency, parseCurrency } from "@/utils/currency";

interface CurrencyContextValue {
  /** Current global currency */
  currency: Currency;
  /** Set the global currency */
  setCurrency: (currency: Currency) => void;
  /** Parse and set currency from string */
  setCurrencyFromString: (currencyStr: string | null | undefined) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: ReactNode;
  /** Initial currency (defaults to UAH) */
  initialCurrency?: Currency;
}

/**
 * CurrencyProvider - Global currency context provider
 * 
 * Provides centralized currency state management across the application.
 * Use this to set and access the current currency for price formatting.
 * 
 * @example
 * // In app layout or root component
 * <CurrencyProvider initialCurrency={Currency.UAH}>
 *   {children}
 * </CurrencyProvider>
 * 
 * // In any component
 * const { currency, setCurrency } = useCurrency();
 */
export function CurrencyProvider({ 
  children, 
  initialCurrency = Currency.UAH 
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  }, []);

  const setCurrencyFromString = useCallback((currencyStr: string | null | undefined) => {
    const parsed = parseCurrency(currencyStr);
    setCurrencyState(parsed);
  }, []);

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    setCurrencyFromString,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * useCurrency - Hook to access currency context
 * 
 * Provides access to the current global currency and methods to update it.
 * Must be used within a CurrencyProvider.
 * 
 * @returns Currency context value
 * @throws Error if used outside CurrencyProvider
 * 
 * @example
 * const { currency, setCurrency } = useCurrency();
 * 
 * // Format a price with current currency
 * const formatted = formatCurrency(priceInCents, currency);
 * 
 * // Update currency when club changes
 * useEffect(() => {
 *   if (club?.defaultCurrency) {
 *     setCurrencyFromString(club.defaultCurrency);
 *   }
 * }, [club, setCurrencyFromString]);
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  
  return context;
}
