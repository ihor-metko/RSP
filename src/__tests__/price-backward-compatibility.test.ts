import {
  formatPrice,
  dollarsToCents,
  centsToDollars,
  Currency,
} from "@/utils/price";

describe("Price Utility - Backward Compatibility & New Features", () => {
  describe("formatPrice - new currency support", () => {
    it("should format UAH prices without decimal places (new default)", () => {
      expect(formatPrice(5000)).toBe("₴50");
      expect(formatPrice(5050)).toBe("₴51");
      expect(formatPrice(100)).toBe("₴1");
      expect(formatPrice(0)).toBe("₴0");
    });

    it("should format USD prices with decimal places when specified", () => {
      expect(formatPrice(5000, Currency.USD)).toBe("$50.00");
      expect(formatPrice(5050, Currency.USD)).toBe("$50.50");
      expect(formatPrice(5005, Currency.USD)).toBe("$50.05");
      expect(formatPrice(100, Currency.USD)).toBe("$1.00");
    });

    it("should format EUR prices with decimal places when specified", () => {
      expect(formatPrice(5000, Currency.EUR)).toBe("€50.00");
      expect(formatPrice(5050, Currency.EUR)).toBe("€50.50");
      expect(formatPrice(100, Currency.EUR)).toBe("€1.00");
    });

    it("should handle explicit UAH currency parameter", () => {
      expect(formatPrice(5000, Currency.UAH)).toBe("₴50");
      expect(formatPrice(5050, Currency.UAH)).toBe("₴51");
    });
  });

  describe("dollarsToCents - backward compatibility", () => {
    it("should convert dollars to cents", () => {
      expect(dollarsToCents(50)).toBe(5000);
      expect(dollarsToCents(50.50)).toBe(5050);
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(1)).toBe(100);
    });

    it("should round fractional cents", () => {
      expect(dollarsToCents(50.555)).toBe(5056);
      expect(dollarsToCents(50.554)).toBe(5055);
    });
  });

  describe("centsToDollars - backward compatibility", () => {
    it("should convert cents to dollars", () => {
      expect(centsToDollars(5000)).toBe(50);
      expect(centsToDollars(5050)).toBe(50.5);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(100)).toBe(1);
    });

    it("should handle decimal precision", () => {
      expect(centsToDollars(5005)).toBe(50.05);
      expect(centsToDollars(5099)).toBe(50.99);
    });
  });

  describe("Integration with existing components", () => {
    it("should maintain existing formatPrice behavior for USD when explicitly specified", () => {
      // Existing components can still get USD formatting by passing Currency.USD
      const price = 5000;
      expect(formatPrice(price, Currency.USD)).toBe("$50.00");
    });

    it("should provide new UAH formatting by default", () => {
      // New behavior: UAH is default and doesn't show coins
      const price = 5000;
      expect(formatPrice(price)).toBe("₴50");
    });
  });
});
