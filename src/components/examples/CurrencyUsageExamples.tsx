/**
 * Example: Currency-Aware Price Display Component
 * 
 * This example demonstrates how to create components that properly
 * handle currency formatting using the global currency system.
 * 
 * Key concepts:
 * 1. Use formatPrice from utils/price (defaults to UAH)
 * 2. Use useCurrencyFormat hook for context-aware formatting
 * 3. Update currency when viewing club-specific content
 */

"use client";

import { useEffect } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice, Currency } from "@/utils/price";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

// ============================================================
// Example 1: Simple Price Display (No Context)
// ============================================================
// For components that don't need dynamic currency switching

interface SimplePriceDisplayProps {
  priceInCents: number;
  currency?: Currency;
}

export function SimplePriceDisplay({ priceInCents, currency }: SimplePriceDisplayProps) {
  // Use formatPrice directly - defaults to UAH
  const formatted = formatPrice(priceInCents, currency);
  
  return <span className="price">{formatted}</span>;
}

// Usage examples:
// <SimplePriceDisplay priceInCents={5000} />                    // "₴50" (UAH default)
// <SimplePriceDisplay priceInCents={5000} currency={Currency.USD} /> // "$50.00"
// <SimplePriceDisplay priceInCents={5050} currency={Currency.EUR} /> // "€50.50"

// ============================================================
// Example 2: Context-Aware Price Display
// ============================================================
// For components that should respect global currency settings

interface ContextAwarePriceDisplayProps {
  priceInCents: number;
  overrideCurrency?: Currency;
}

export function ContextAwarePriceDisplay({ 
  priceInCents, 
  overrideCurrency 
}: ContextAwarePriceDisplayProps) {
  // Use the convenience hook for automatic currency handling
  const { formatPrice } = useCurrencyFormat();
  
  // Format with context currency, or override if specified
  const formatted = formatPrice(priceInCents, overrideCurrency);
  
  return <span className="price">{formatted}</span>;
}

// Usage:
// <ContextAwarePriceDisplay priceInCents={5000} />
// Will display according to current global currency setting

// ============================================================
// Example 3: Club-Specific Price Display
// ============================================================
// For components that display prices for a specific club
// and should update currency based on club's default currency

interface ClubPriceDisplayProps {
  clubId: string;
  clubName: string;
  clubCurrency: string | null; // From club.defaultCurrency
  priceInCents: number;
}

export function ClubPriceDisplay({ 
  clubId, 
  clubName, 
  clubCurrency, 
  priceInCents 
}: ClubPriceDisplayProps) {
  const { setCurrencyFromString, currency } = useCurrency();
  const { formatPrice } = useCurrencyFormat();
  
  // Update global currency when club changes
  useEffect(() => {
    if (clubCurrency) {
      setCurrencyFromString(clubCurrency);
    }
  }, [clubId, clubCurrency, setCurrencyFromString]);
  
  return (
    <div>
      <h3>{clubName}</h3>
      <div className="price-display">
        <span className="label">Price:</span>
        <span className="price">{formatPrice(priceInCents)}</span>
        <span className="currency-code">{currency}</span>
      </div>
    </div>
  );
}

// ============================================================
// Example 4: Price List with Multiple Currencies
// ============================================================
// For components that need to display prices in different currencies

interface PriceItem {
  label: string;
  priceInCents: number;
  currency?: Currency;
}

interface MultiCurrencyPriceListProps {
  items: PriceItem[];
}

export function MultiCurrencyPriceList({ items }: MultiCurrencyPriceListProps) {
  return (
    <ul className="price-list">
      {items.map((item, index) => (
        <li key={index} className="price-item">
          <span className="label">{item.label}</span>
          <span className="price">
            {formatPrice(item.priceInCents, item.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Usage:
// <MultiCurrencyPriceList items={[
//   { label: "Ukrainian Booking", priceInCents: 5000, currency: Currency.UAH },
//   { label: "US Booking", priceInCents: 5000, currency: Currency.USD },
//   { label: "EU Booking", priceInCents: 5000, currency: Currency.EUR },
// ]} />
// Output:
// Ukrainian Booking: ₴50
// US Booking: $50.00
// EU Booking: €50.00

// ============================================================
// Example 5: Price Summary with Totals
// ============================================================
// For components that calculate and display totals

interface BookingItem {
  courtName: string;
  priceInCents: number;
}

interface PriceSummaryProps {
  items: BookingItem[];
}

export function PriceSummary({ items }: PriceSummaryProps) {
  const { formatPrice } = useCurrencyFormat();
  
  // Calculate total
  const totalCents = items.reduce((sum, item) => sum + item.priceInCents, 0);
  
  return (
    <div className="price-summary">
      <div className="items">
        {items.map((item, index) => (
          <div key={index} className="summary-row">
            <span>{item.courtName}</span>
            <span>{formatPrice(item.priceInCents)}</span>
          </div>
        ))}
      </div>
      <div className="total-row">
        <span className="total-label">Total:</span>
        <span className="total-price">{formatPrice(totalCents)}</span>
      </div>
    </div>
  );
}

// ============================================================
// Example 6: Price Input Form
// ============================================================
// For components that need to input prices and convert to cents

import { useState } from "react";
import { toCents, fromCents } from "@/utils/price";

interface PriceInputProps {
  defaultPriceCents?: number;
  onPriceChange: (priceInCents: number) => void;
}

export function PriceInput({ defaultPriceCents = 0, onPriceChange }: PriceInputProps) {
  const { currency } = useCurrency();
  const [displayValue, setDisplayValue] = useState(
    fromCents(defaultPriceCents, currency).toString()
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const cents = toCents(numValue, currency);
      onPriceChange(cents);
    }
  };
  
  return (
    <div className="price-input">
      <label htmlFor="price">Price ({currency})</label>
      <input
        id="price"
        type="number"
        step="0.01"
        min="0"
        value={displayValue}
        onChange={handleChange}
        placeholder={`Enter price in ${currency}`}
      />
    </div>
  );
}

// ============================================================
// Best Practices Summary
// ============================================================
/**
 * 1. Default Behavior:
 *    - Always use UAH as the default currency
 *    - UAH shows no decimal places (₴50, not ₴50.00)
 * 
 * 2. When to Use Each Approach:
 *    - formatPrice() directly: Static prices, known currency
 *    - useCurrencyFormat(): Dynamic prices, respect global currency
 *    - useCurrency(): Need to change global currency or access it
 * 
 * 3. Club-Specific Currency:
 *    - Update global currency when entering club views
 *    - Use useEffect with clubId and setCurrencyFromString
 * 
 * 4. Form Inputs:
 *    - Always store prices in cents in the database
 *    - Use toCents() when converting user input
 *    - Use fromCents() when displaying in forms
 * 
 * 5. Backward Compatibility:
 *    - Old code using formatPrice() will now show UAH by default
 *    - To maintain USD: pass Currency.USD as second parameter
 *    - dollarsToCents() and centsToDollars() still work for USD
 * 
 * 6. Testing:
 *    - Test components with different currencies
 *    - Verify UAH shows no decimal places
 *    - Verify USD/EUR show 2 decimal places
 *    - Test edge cases (zero, negative, large amounts)
 */
