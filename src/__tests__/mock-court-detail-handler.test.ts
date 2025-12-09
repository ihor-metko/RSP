/**
 * @jest-environment node
 */
import { mockGetCourtDetailById } from "@/services/mockApiHandlers";

describe("mockGetCourtDetailById", () => {
  it("should return court with business hours and price rules", async () => {
    const courtDetail = await mockGetCourtDetailById("court-1");
    
    expect(courtDetail).not.toBeNull();
    if (!courtDetail) return;
    
    // Check basic court info
    expect(courtDetail.id).toBe("court-1");
    expect(courtDetail.name).toBe("Court 1");
    expect(courtDetail.clubId).toBe("club-1");
    
    // Check club info with business hours
    expect(courtDetail.club).toBeDefined();
    expect(courtDetail.club?.id).toBe("club-1");
    expect(courtDetail.club?.name).toBe("Downtown Padel Club");
    expect(courtDetail.club?.businessHours).toBeDefined();
    expect(courtDetail.club?.businessHours?.length).toBe(7); // One for each day
    
    // Check price rules
    expect(courtDetail.courtPriceRules).toBeDefined();
    expect(courtDetail.courtPriceRules?.length).toBeGreaterThan(0);
    
    // Verify price rules structure
    courtDetail.courtPriceRules?.forEach(rule => {
      expect(rule).toHaveProperty("id");
      expect(rule).toHaveProperty("courtId");
      expect(rule).toHaveProperty("dayOfWeek");
      expect(rule).toHaveProperty("startTime");
      expect(rule).toHaveProperty("endTime");
      expect(rule).toHaveProperty("priceCents");
    });
  });

  it("should return null for non-existent court", async () => {
    const courtDetail = await mockGetCourtDetailById("non-existent-court");
    expect(courtDetail).toBeNull();
  });

  it("should have peak price rules with correct structure", async () => {
    const courtDetail = await mockGetCourtDetailById("court-1");
    
    expect(courtDetail).not.toBeNull();
    if (!courtDetail) return;
    
    // Find weekday peak rule
    const weekdayPeak = courtDetail.courtPriceRules?.find(
      pr => pr.dayOfWeek >= 1 && pr.dayOfWeek <= 5 && 
            pr.startTime === "17:00" && pr.endTime === "21:00"
    );
    
    expect(weekdayPeak).toBeDefined();
    expect(weekdayPeak?.priceCents).toBe(6250); // 5000 * 1.25
  });

  it("should have business hours with correct format", async () => {
    const courtDetail = await mockGetCourtDetailById("court-1");
    
    expect(courtDetail).not.toBeNull();
    if (!courtDetail) return;
    
    const businessHours = courtDetail.club?.businessHours;
    expect(businessHours).toBeDefined();
    
    // Check Monday (dayOfWeek 1)
    const monday = businessHours?.find(bh => bh.dayOfWeek === 1);
    expect(monday).toBeDefined();
    expect(monday?.openTime).toBe("06:00");
    expect(monday?.closeTime).toBe("22:00");
    expect(monday?.isClosed).toBe(false);
  });
});
