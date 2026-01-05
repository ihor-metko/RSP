/**
 * Integration test to verify backward compatibility of the currency system
 * with existing components and usage patterns.
 */

import { formatPrice, dollarsToCents, centsToDollars, Currency } from "@/utils/price";

describe("Currency System - Integration & Backward Compatibility", () => {
  describe("Existing component compatibility", () => {
    it("should maintain existing formatPrice behavior when currency is specified", () => {
      // Components that explicitly pass Currency.USD should continue to work
      const price = 5000;
      expect(formatPrice(price, Currency.USD)).toBe("$50.00");
      
      // Components that explicitly pass Currency.EUR should work
      expect(formatPrice(price, Currency.EUR)).toBe("€50.00");
    });

    it("should default to UAH for new behavior", () => {
      // New default behavior: UAH without decimal places
      const price = 5000;
      expect(formatPrice(price)).toBe("₴50");
    });

    it("should handle price ranges correctly across currencies", () => {
      const minPrice = 3000;
      const maxPrice = 8000;

      // UAH range (no decimals)
      expect(formatPrice(minPrice, Currency.UAH)).toBe("₴30");
      expect(formatPrice(maxPrice, Currency.UAH)).toBe("₴80");

      // USD range (with decimals)
      expect(formatPrice(minPrice, Currency.USD)).toBe("$30.00");
      expect(formatPrice(maxPrice, Currency.USD)).toBe("$80.00");
    });

    it("should handle fractional prices correctly for UAH", () => {
      // UAH rounds to whole numbers
      expect(formatPrice(5025, Currency.UAH)).toBe("₴50"); // Rounds down
      expect(formatPrice(5050, Currency.UAH)).toBe("₴51"); // Rounds up
      expect(formatPrice(5075, Currency.UAH)).toBe("₴51"); // Rounds up
    });

    it("should handle fractional prices correctly for USD/EUR", () => {
      // USD keeps decimals
      expect(formatPrice(5025, Currency.USD)).toBe("$50.25");
      expect(formatPrice(5050, Currency.USD)).toBe("$50.50");
      expect(formatPrice(5075, Currency.USD)).toBe("$50.75");

      // EUR keeps decimals
      expect(formatPrice(5025, Currency.EUR)).toBe("€50.25");
      expect(formatPrice(5050, Currency.EUR)).toBe("€50.50");
      expect(formatPrice(5075, Currency.EUR)).toBe("€50.75");
    });
  });

  describe("Conversion functions compatibility", () => {
    it("should maintain dollarsToCents functionality", () => {
      // Legacy function for USD conversions
      expect(dollarsToCents(50)).toBe(5000);
      expect(dollarsToCents(50.50)).toBe(5050);
      expect(dollarsToCents(0)).toBe(0);
    });

    it("should maintain centsToDollars functionality", () => {
      // Legacy function for USD conversions
      expect(centsToDollars(5000)).toBe(50);
      expect(centsToDollars(5050)).toBe(50.5);
      expect(centsToDollars(0)).toBe(0);
    });
  });

  describe("Real-world component patterns", () => {
    it("should handle court card price display", () => {
      const defaultPriceCents = 5000;
      const slotPriceCents = 6000;

      // Default to UAH for Ukrainian courts
      expect(formatPrice(defaultPriceCents)).toBe("₴50");
      expect(formatPrice(slotPriceCents)).toBe("₴60");

      // Support USD for international courts
      expect(formatPrice(defaultPriceCents, Currency.USD)).toBe("$50.00");
      expect(formatPrice(slotPriceCents, Currency.USD)).toBe("$60.00");
    });

    it("should handle booking summary totals", () => {
      const items = [
        { courtName: "Court 1", priceCents: 5000 },
        { courtName: "Court 2", priceCents: 6000 },
        { courtName: "Court 3", priceCents: 4500 },
      ];

      const totalCents = items.reduce((sum, item) => sum + item.priceCents, 0);
      
      // UAH total
      expect(formatPrice(totalCents, Currency.UAH)).toBe("₴155");
      
      // USD total
      expect(formatPrice(totalCents, Currency.USD)).toBe("$155.00");
    });

    it("should handle price rules display", () => {
      const priceRules = [
        { time: "09:00-12:00", priceCents: 4000 },
        { time: "12:00-18:00", priceCents: 5000 },
        { time: "18:00-22:00", priceCents: 6000 },
      ];

      // UAH formatting
      const uahPrices = priceRules.map(rule => formatPrice(rule.priceCents, Currency.UAH));
      expect(uahPrices).toEqual(["₴40", "₴50", "₴60"]);

      // USD formatting
      const usdPrices = priceRules.map(rule => formatPrice(rule.priceCents, Currency.USD));
      expect(usdPrices).toEqual(["$40.00", "$50.00", "$60.00"]);
    });

    it("should handle invoice/receipt displays", () => {
      const subtotal = 10000;
      const tax = 2000;
      const total = subtotal + tax;

      // UAH invoice
      expect(formatPrice(subtotal, Currency.UAH)).toBe("₴100");
      expect(formatPrice(tax, Currency.UAH)).toBe("₴20");
      expect(formatPrice(total, Currency.UAH)).toBe("₴120");

      // USD invoice
      expect(formatPrice(subtotal, Currency.USD)).toBe("$100.00");
      expect(formatPrice(tax, Currency.USD)).toBe("$20.00");
      expect(formatPrice(total, Currency.USD)).toBe("$120.00");
    });
  });

  describe("Edge cases and data integrity", () => {
    it("should handle zero prices correctly", () => {
      expect(formatPrice(0, Currency.UAH)).toBe("₴0");
      expect(formatPrice(0, Currency.USD)).toBe("$0.00");
      expect(formatPrice(0, Currency.EUR)).toBe("€0.00");
    });

    it("should handle very large prices", () => {
      const largePrice = 1000000; // 10,000 UAH / 10,000 USD

      expect(formatPrice(largePrice, Currency.UAH)).toBe("₴10000");
      expect(formatPrice(largePrice, Currency.USD)).toBe("$10000.00");
      expect(formatPrice(largePrice, Currency.EUR)).toBe("€10000.00");
    });

    it("should handle very small prices", () => {
      const smallPrice = 1; // 0.01 UAH / 0.01 USD

      expect(formatPrice(smallPrice, Currency.UAH)).toBe("₴0"); // Rounds to 0
      expect(formatPrice(smallPrice, Currency.USD)).toBe("$0.01");
      expect(formatPrice(smallPrice, Currency.EUR)).toBe("€0.01");
    });

    it("should handle negative prices (refunds)", () => {
      const refund = -5000;

      expect(formatPrice(refund, Currency.UAH)).toBe("₴-50");
      expect(formatPrice(refund, Currency.USD)).toBe("$-50.00");
      expect(formatPrice(refund, Currency.EUR)).toBe("€-50.00");
    });
  });

  describe("Migration path validation", () => {
    it("should allow gradual migration from USD to UAH", () => {
      const price = 5000;

      // Old code (implicit USD is now UAH)
      const oldBehavior = formatPrice(price);
      expect(oldBehavior).toBe("₴50"); // New default

      // Updated code (explicit USD)
      const newBehavior = formatPrice(price, Currency.USD);
      expect(newBehavior).toBe("$50.00"); // Maintains USD format
    });

    it("should support mixed currency scenarios", () => {
      // Component displaying prices from different clubs
      const ukrainianClubPrice = formatPrice(5000, Currency.UAH);
      const usClubPrice = formatPrice(5000, Currency.USD);
      const euClubPrice = formatPrice(5000, Currency.EUR);

      expect(ukrainianClubPrice).toBe("₴50");
      expect(usClubPrice).toBe("$50.00");
      expect(euClubPrice).toBe("€50.00");
    });
  });

  describe("Type safety", () => {
    it("should enforce Currency enum usage", () => {
      const price = 5000;

      // These should all compile and work correctly
      expect(() => formatPrice(price, Currency.UAH)).not.toThrow();
      expect(() => formatPrice(price, Currency.USD)).not.toThrow();
      expect(() => formatPrice(price, Currency.EUR)).not.toThrow();
    });
  });
});
