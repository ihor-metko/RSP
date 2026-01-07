import {
  Currency,
  formatCurrency,
  toCents,
  fromCents,
  parseCurrency,
  getCurrencySymbol,
  getCurrencyDecimalPlaces,
} from "@/utils/currency";

describe("Currency Utility", () => {
  describe("formatCurrency", () => {
    it("should format UAH without decimal places", () => {
      expect(formatCurrency(5000, Currency.UAH)).toBe("₴50");
      expect(formatCurrency(5050, Currency.UAH)).toBe("₴51"); // Rounds up
      expect(formatCurrency(5025, Currency.UAH)).toBe("₴50"); // Rounds down
      expect(formatCurrency(0, Currency.UAH)).toBe("₴0");
      expect(formatCurrency(100, Currency.UAH)).toBe("₴1");
    });

    it("should format USD with 2 decimal places", () => {
      expect(formatCurrency(5000, Currency.USD)).toBe("$50.00");
      expect(formatCurrency(5050, Currency.USD)).toBe("$50.50");
      expect(formatCurrency(5005, Currency.USD)).toBe("$50.05");
      expect(formatCurrency(0, Currency.USD)).toBe("$0.00");
      expect(formatCurrency(100, Currency.USD)).toBe("$1.00");
    });

    it("should format EUR with 2 decimal places", () => {
      expect(formatCurrency(5000, Currency.EUR)).toBe("€50.00");
      expect(formatCurrency(5050, Currency.EUR)).toBe("€50.50");
      expect(formatCurrency(5005, Currency.EUR)).toBe("€50.05");
      expect(formatCurrency(0, Currency.EUR)).toBe("€0.00");
      expect(formatCurrency(100, Currency.EUR)).toBe("€1.00");
    });

    it("should default to UAH when currency is not specified", () => {
      expect(formatCurrency(5000)).toBe("₴50");
      expect(formatCurrency(5050)).toBe("₴51");
    });

    it("should handle large amounts correctly", () => {
      expect(formatCurrency(1000000, Currency.UAH)).toBe("₴10000");
      expect(formatCurrency(1000000, Currency.USD)).toBe("$10000.00");
      expect(formatCurrency(1000000, Currency.EUR)).toBe("€10000.00");
    });

    it("should handle fractional cents correctly for USD", () => {
      expect(formatCurrency(5001, Currency.USD)).toBe("$50.01");
      expect(formatCurrency(5099, Currency.USD)).toBe("$50.99");
    });
  });

  describe("toCents", () => {
    it("should convert UAH amount to cents", () => {
      expect(toCents(50, Currency.UAH)).toBe(5000);
      expect(toCents(0, Currency.UAH)).toBe(0);
      expect(toCents(100, Currency.UAH)).toBe(10000);
      expect(toCents(50.5, Currency.UAH)).toBe(5050); // Rounds to 5050
    });

    it("should convert USD amount to cents", () => {
      expect(toCents(50, Currency.USD)).toBe(5000);
      expect(toCents(50.50, Currency.USD)).toBe(5050);
      expect(toCents(50.05, Currency.USD)).toBe(5005);
      expect(toCents(0, Currency.USD)).toBe(0);
    });

    it("should convert EUR amount to cents", () => {
      expect(toCents(50, Currency.EUR)).toBe(5000);
      expect(toCents(50.50, Currency.EUR)).toBe(5050);
      expect(toCents(50.05, Currency.EUR)).toBe(5005);
      expect(toCents(0, Currency.EUR)).toBe(0);
    });

    it("should default to UAH when currency is not specified", () => {
      expect(toCents(50)).toBe(5000);
      expect(toCents(100)).toBe(10000);
    });

    it("should round fractional cents", () => {
      expect(toCents(50.555, Currency.USD)).toBe(5056); // Rounds to nearest cent
      expect(toCents(50.554, Currency.USD)).toBe(5055);
    });
  });

  describe("fromCents", () => {
    it("should convert UAH cents to amount", () => {
      expect(fromCents(5000, Currency.UAH)).toBe(50);
      expect(fromCents(0, Currency.UAH)).toBe(0);
      expect(fromCents(10000, Currency.UAH)).toBe(100);
      expect(fromCents(5050, Currency.UAH)).toBe(50.5);
    });

    it("should convert USD cents to amount", () => {
      expect(fromCents(5000, Currency.USD)).toBe(50);
      expect(fromCents(5050, Currency.USD)).toBe(50.5);
      expect(fromCents(5005, Currency.USD)).toBe(50.05);
      expect(fromCents(0, Currency.USD)).toBe(0);
    });

    it("should convert EUR cents to amount", () => {
      expect(fromCents(5000, Currency.EUR)).toBe(50);
      expect(fromCents(5050, Currency.EUR)).toBe(50.5);
      expect(fromCents(5005, Currency.EUR)).toBe(50.05);
      expect(fromCents(0, Currency.EUR)).toBe(0);
    });

    it("should default to UAH when currency is not specified", () => {
      expect(fromCents(5000)).toBe(50);
      expect(fromCents(10000)).toBe(100);
    });
  });

  describe("parseCurrency", () => {
    it("should parse valid currency strings", () => {
      expect(parseCurrency("UAH")).toBe(Currency.UAH);
      expect(parseCurrency("USD")).toBe(Currency.USD);
      expect(parseCurrency("EUR")).toBe(Currency.EUR);
    });

    it("should parse case-insensitive currency strings", () => {
      expect(parseCurrency("uah")).toBe(Currency.UAH);
      expect(parseCurrency("usd")).toBe(Currency.USD);
      expect(parseCurrency("eur")).toBe(Currency.EUR);
      expect(parseCurrency("Uah")).toBe(Currency.UAH);
    });

    it("should default to UAH for invalid currencies", () => {
      expect(parseCurrency("INVALID")).toBe(Currency.UAH);
      expect(parseCurrency("")).toBe(Currency.UAH);
      expect(parseCurrency(null)).toBe(Currency.UAH);
      expect(parseCurrency(undefined)).toBe(Currency.UAH);
    });
  });

  describe("getCurrencySymbol", () => {
    it("should return correct symbols for each currency", () => {
      expect(getCurrencySymbol(Currency.UAH)).toBe("₴");
      expect(getCurrencySymbol(Currency.USD)).toBe("$");
      expect(getCurrencySymbol(Currency.EUR)).toBe("€");
    });
  });

  describe("getCurrencyDecimalPlaces", () => {
    it("should return correct decimal places for each currency", () => {
      expect(getCurrencyDecimalPlaces(Currency.UAH)).toBe(0);
      expect(getCurrencyDecimalPlaces(Currency.USD)).toBe(2);
      expect(getCurrencyDecimalPlaces(Currency.EUR)).toBe(2);
    });
  });

  describe("Round-trip conversions", () => {
    it("should maintain value integrity through toCents and fromCents", () => {
      const testAmounts = [0, 1, 50, 100, 999.99];
      
      testAmounts.forEach(amount => {
        expect(fromCents(toCents(amount, Currency.USD), Currency.USD)).toBe(amount);
        expect(fromCents(toCents(amount, Currency.EUR), Currency.EUR)).toBe(amount);
      });
    });

    it("should handle UAH rounding through round-trip", () => {
      // UAH has no decimal places, so fractional amounts will be rounded
      expect(fromCents(toCents(50.5, Currency.UAH), Currency.UAH)).toBe(50.5);
      expect(fromCents(toCents(50.25, Currency.UAH), Currency.UAH)).toBe(50.25);
    });
  });

  describe("Special cases and edge cases", () => {
    it("should handle zero correctly for all currencies", () => {
      expect(formatCurrency(0, Currency.UAH)).toBe("₴0");
      expect(formatCurrency(0, Currency.USD)).toBe("$0.00");
      expect(formatCurrency(0, Currency.EUR)).toBe("€0.00");
    });

    it("should handle very small amounts", () => {
      expect(formatCurrency(1, Currency.UAH)).toBe("₴0"); // Rounds to 0
      expect(formatCurrency(1, Currency.USD)).toBe("$0.01");
      expect(formatCurrency(1, Currency.EUR)).toBe("€0.01");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-5000, Currency.UAH)).toBe("₴-50");
      expect(formatCurrency(-5000, Currency.USD)).toBe("$-50.00");
      expect(formatCurrency(-5000, Currency.EUR)).toBe("€-50.00");
    });
  });
});
