/**
 * Integration test for price range calculation and display
 */
import { calculatePriceRange, formatPriceRange } from "@/utils/price";

describe("Club Detail Page - Price Range Integration", () => {
  describe("Price range calculation with courts data", () => {
    it("should calculate and format price range for courts with different prices", () => {
      const courts = [
        { id: "court-1", name: "Court 1", indoor: true, defaultPriceCents: 3000 },
        { id: "court-2", name: "Court 2", indoor: false, defaultPriceCents: 5000 },
        { id: "court-3", name: "Court 3", indoor: true, defaultPriceCents: 7000 },
      ];

      const priceRange = calculatePriceRange(courts);
      expect(priceRange).not.toBeNull();
      
      const formattedRange = priceRange 
        ? formatPriceRange(priceRange.minPrice, priceRange.maxPrice) 
        : "";
      
      expect(formattedRange).toBe("$30.00 - $70.00");
    });

    it("should calculate and format single price for courts with same price", () => {
      const courts = [
        { id: "court-1", name: "Court 1", indoor: true, defaultPriceCents: 5000 },
        { id: "court-2", name: "Court 2", indoor: false, defaultPriceCents: 5000 },
      ];

      const priceRange = calculatePriceRange(courts);
      expect(priceRange).not.toBeNull();
      
      const formattedRange = priceRange 
        ? formatPriceRange(priceRange.minPrice, priceRange.maxPrice) 
        : "";
      
      expect(formattedRange).toBe("$50.00");
    });

    it("should return null for empty courts array", () => {
      const courts: Array<{ defaultPriceCents: number }> = [];

      const priceRange = calculatePriceRange(courts);
      expect(priceRange).toBeNull();
    });

    it("should handle courts with zero price", () => {
      const courts = [
        { id: "court-1", name: "Court 1", indoor: true, defaultPriceCents: 0 },
        { id: "court-2", name: "Court 2", indoor: false, defaultPriceCents: 5000 },
      ];

      const priceRange = calculatePriceRange(courts);
      expect(priceRange).not.toBeNull();
      
      const formattedRange = priceRange 
        ? formatPriceRange(priceRange.minPrice, priceRange.maxPrice) 
        : "";
      
      expect(formattedRange).toBe("$0.00 - $50.00");
    });

    it("should handle courts with fractional cent prices", () => {
      const courts = [
        { id: "court-1", name: "Court 1", indoor: true, defaultPriceCents: 4550 },
        { id: "court-2", name: "Court 2", indoor: false, defaultPriceCents: 6750 },
      ];

      const priceRange = calculatePriceRange(courts);
      expect(priceRange).not.toBeNull();
      
      const formattedRange = priceRange 
        ? formatPriceRange(priceRange.minPrice, priceRange.maxPrice) 
        : "";
      
      expect(formattedRange).toBe("$45.50 - $67.50");
    });
  });

  describe("Price range display logic", () => {
    it("should show 'per hour' suffix with price range", () => {
      const courts = [
        { id: "court-1", name: "Court 1", indoor: true, defaultPriceCents: 3000 },
        { id: "court-2", name: "Court 2", indoor: false, defaultPriceCents: 7000 },
      ];

      const priceRange = calculatePriceRange(courts);
      expect(priceRange).not.toBeNull();
      
      const formattedRange = priceRange 
        ? `${formatPriceRange(priceRange.minPrice, priceRange.maxPrice)} per hour` 
        : "";
      
      expect(formattedRange).toBe("$30.00 - $70.00 per hour");
    });

    it("should conditionally display price range based on courts availability", () => {
      // No courts - should not display
      const emptyCourts: Array<{ defaultPriceCents: number }> = [];
      const emptyPriceRange = calculatePriceRange(emptyCourts);
      expect(emptyPriceRange).toBeNull();

      // With courts - should display
      const courtsWithData = [
        { id: "court-1", name: "Court 1", indoor: true, defaultPriceCents: 5000 },
      ];
      const validPriceRange = calculatePriceRange(courtsWithData);
      expect(validPriceRange).not.toBeNull();
    });
  });
});
