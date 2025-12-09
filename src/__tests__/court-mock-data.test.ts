/**
 * @jest-environment node
 */
import { getMockBusinessHours, getMockCourtPriceRules, getMockCourts, getMockClubs } from "@/services/mockDb";

describe("Mock Data for Court Details", () => {
  it("should have business hours for all clubs", () => {
    const clubs = getMockClubs();
    const businessHours = getMockBusinessHours();
    
    // Should have 7 days worth of hours for each club
    expect(businessHours.length).toBe(clubs.length * 7);
    
    // Verify each club has business hours
    clubs.forEach(club => {
      const clubHours = businessHours.filter(bh => bh.clubId === club.id);
      expect(clubHours.length).toBe(7); // One for each day of week
    });
  });

  it("should have price rules for all courts", () => {
    const courts = getMockCourts();
    const priceRules = getMockCourtPriceRules();
    
    // Each court should have price rules (weekday peak + weekend peak)
    expect(priceRules.length).toBeGreaterThan(0);
    
    courts.forEach(court => {
      const courtRules = priceRules.filter(pr => pr.courtId === court.id);
      expect(courtRules.length).toBeGreaterThan(0);
    });
  });

  it("should have peak pricing rules for weekdays 5pm-9pm", () => {
    const priceRules = getMockCourtPriceRules();
    
    // Find weekday peak rules
    const weekdayPeakRules = priceRules.filter(
      pr => pr.dayOfWeek && pr.dayOfWeek >= 1 && pr.dayOfWeek <= 5 && 
            pr.startTime === "17:00" && pr.endTime === "21:00"
    );
    
    expect(weekdayPeakRules.length).toBeGreaterThan(0);
  });

  it("should have peak pricing rules for weekends 9am-6pm", () => {
    const priceRules = getMockCourtPriceRules();
    
    // Find weekend peak rules
    const weekendPeakRules = priceRules.filter(
      pr => (pr.dayOfWeek === 0 || pr.dayOfWeek === 6) && 
            pr.startTime === "09:00" && pr.endTime === "18:00"
    );
    
    expect(weekendPeakRules.length).toBeGreaterThan(0);
  });

  it("should have business hours with standard schedule", () => {
    const businessHours = getMockBusinessHours();
    
    // Check Monday hours (should be 6am-10pm)
    const mondayHours = businessHours.filter(bh => bh.dayOfWeek === 1);
    expect(mondayHours.length).toBeGreaterThan(0);
    mondayHours.forEach(bh => {
      expect(bh.openTime).toBe("06:00");
      expect(bh.closeTime).toBe("22:00");
      expect(bh.isClosed).toBe(false);
    });
    
    // Check Sunday hours (should be 8am-8pm)
    const sundayHours = businessHours.filter(bh => bh.dayOfWeek === 0);
    expect(sundayHours.length).toBeGreaterThan(0);
    sundayHours.forEach(bh => {
      expect(bh.openTime).toBe("08:00");
      expect(bh.closeTime).toBe("20:00");
      expect(bh.isClosed).toBe(false);
    });
  });

  it("should have peak prices that are 25% higher than default", () => {
    const courts = getMockCourts();
    const priceRules = getMockCourtPriceRules();
    
    courts.forEach(court => {
      const courtRules = priceRules.filter(pr => pr.courtId === court.id);
      if (courtRules.length > 0) {
        const expectedPeakPrice = Math.floor(court.defaultPriceCents * 1.25);
        courtRules.forEach(rule => {
          expect(rule.priceCents).toBe(expectedPeakPrice);
        });
      }
    });
  });
});
