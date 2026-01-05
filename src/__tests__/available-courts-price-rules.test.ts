/**
 * @jest-environment node
 */
import { GET } from "@/app/api/(player)/clubs/[id]/available-courts/route";
import { prisma } from "@/lib/prisma";
import { getResolvedPriceForSlot } from "@/lib/priceRules";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  },
}));

// Mock priceRules
jest.mock("@/lib/priceRules", () => ({
  getResolvedPriceForSlot: jest.fn(),
}));

describe("GET /api/clubs/[id]/available-courts - Price Rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (clubId: string, params: { date: string; start: string; duration: string }) => {
    const searchParams = new URLSearchParams(params);
    const url = `http://localhost:3000/api/clubs/${clubId}/available-courts?${searchParams}`;
    return new Request(url, { method: "GET" });
  };

  it("should return resolved prices based on court price rules", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "Singles",
          surface: "Clay",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 3000, // $30/hour
        },
        {
          id: "court-2",
          name: "Court 2",
          slug: "court-2",
          type: "Doubles",
          surface: "Hard",
          indoor: false,
          sportType: "PADEL",
          defaultPriceCents: 4000, // $40/hour
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    
    // Mock resolved prices for each court (60 minutes booking)
    (getResolvedPriceForSlot as jest.Mock)
      .mockResolvedValueOnce(2500) // Court 1: $25 (discounted from $30)
      .mockResolvedValueOnce(4500); // Court 2: $45 (premium from $40)

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "18:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.availableCourts).toHaveLength(2);
    expect(data.availableCourts[0]).toMatchObject({
      id: "court-1",
      name: "Court 1",
      priceCents: 2500, // Resolved price from price rules
    });
    expect(data.availableCourts[1]).toMatchObject({
      id: "court-2",
      name: "Court 2",
      priceCents: 4500, // Resolved price from price rules
    });
    
    // Verify getResolvedPriceForSlot was called with correct parameters
    expect(getResolvedPriceForSlot).toHaveBeenCalledWith("court-1", "2024-01-15", "18:00", 60);
    expect(getResolvedPriceForSlot).toHaveBeenCalledWith("court-2", "2024-01-15", "18:00", 60);
  });

  it("should calculate min/max price range correctly with different court prices", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Budget Court",
          slug: "court-1",
          type: "Singles",
          surface: "Clay",
          indoor: false,
          sportType: "PADEL",
          defaultPriceCents: 2000,
        },
        {
          id: "court-2",
          name: "Standard Court",
          slug: "court-2",
          type: "Doubles",
          surface: "Hard",
          indoor: false,
          sportType: "PADEL",
          defaultPriceCents: 3000,
        },
        {
          id: "court-3",
          name: "Premium Court",
          slug: "court-3",
          type: "Doubles",
          surface: "Hard",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 5000,
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    
    // Mock resolved prices
    (getResolvedPriceForSlot as jest.Mock)
      .mockResolvedValueOnce(1800) // Budget: $18
      .mockResolvedValueOnce(2700) // Standard: $27
      .mockResolvedValueOnce(5500); // Premium: $55

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "10:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // All courts should be available
    expect(data.availableCourts).toHaveLength(3);
    
    // Extract prices and verify range
    const prices = data.availableCourts.map((c: { priceCents: number }) => c.priceCents);
    expect(Math.min(...prices)).toBe(1800); // Min price
    expect(Math.max(...prices)).toBe(5500); // Max price
  });

  it("should return empty array when no courts are available", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "Singles",
          surface: "Clay",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 3000,
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    
    // Mock booking that overlaps with the requested slot
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([
      {
        courtId: "court-1",
        start: new Date("2024-01-15T18:00:00.000Z"),
        end: new Date("2024-01-15T19:00:00.000Z"),
      },
    ]);

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "18:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.availableCourts).toHaveLength(0);
    
    // getResolvedPriceForSlot should not be called if no courts are available
    expect(getResolvedPriceForSlot).not.toHaveBeenCalled();
  });

  it("should fall back to default price when getResolvedPriceForSlot fails", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "Singles",
          surface: "Clay",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 3000, // $30/hour
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    
    // Mock getResolvedPriceForSlot to throw an error
    (getResolvedPriceForSlot as jest.Mock).mockRejectedValue(new Error("Database error"));

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "18:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Court should still be available with fallback price
    expect(data.availableCourts).toHaveLength(1);
    expect(data.availableCourts[0]).toMatchObject({
      id: "court-1",
      name: "Court 1",
      priceCents: 3000, // Fallback to default price (3000 cents / 60 min * 60 min = 3000)
    });
  });
});
