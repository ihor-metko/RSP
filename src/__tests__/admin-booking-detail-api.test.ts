/**
 * @jest-environment node
 */
import { GET, PATCH } from "@/app/api/admin/bookings/[id]/route";

// Default mock for requireAnyAdmin - will be overridden in tests
const mockRequireAnyAdmin = jest.fn();
jest.mock("@/lib/requireRole", () => ({
  requireAnyAdmin: (...args: unknown[]) => mockRequireAnyAdmin(...args),
}));

// Mock mode functions
const mockIsMockMode = jest.fn();
const mockGetBookingById = jest.fn();
const mockUpdateBookingById = jest.fn();

jest.mock("@/services/mockDb", () => ({
  isMockMode: () => mockIsMockMode(),
}));

jest.mock("@/services/mockApiHandlers", () => ({
  mockGetBookingById: (...args: unknown[]) => mockGetBookingById(...args),
  mockUpdateBookingById: (...args: unknown[]) => mockUpdateBookingById(...args),
}));

describe("GET /api/admin/bookings/:id (Mock Mode)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMockMode.mockReturnValue(true);
  });

  const createRequest = (id: string) => {
    const url = new URL(`http://localhost:3000/api/admin/bookings/${id}`);
    return new Request(url.toString(), { method: "GET" });
  };

  const createParams = (id: string) => Promise.resolve({ id });

  describe("Authorization", () => {
    it("should return 401 for unauthenticated users", async () => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = createRequest("booking-1");
      const params = createParams("booking-1");
      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it("should return 403 for non-admin users", async () => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = createRequest("booking-1");
      const params = createParams("booking-1");
      const response = await GET(request, { params });

      expect(response.status).toBe(403);
    });
  });

  describe("Root admin", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "root-user-id",
        isRoot: true,
        adminType: "root_admin",
        managedIds: [],
      });
    });

    it("should return booking details for root admin", async () => {
      const mockBooking = {
        id: "booking-1",
        userId: "user-4",
        userName: "John Player",
        userEmail: "player@example.com",
        courtId: "court-1",
        courtName: "Court 1",
        courtType: "padel",
        courtSurface: "artificial_grass",
        clubId: "club-1",
        clubName: "Downtown Padel Club",
        organizationId: "org-1",
        organizationName: "Padel Sports Inc",
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T11:00:00.000Z",
        status: "paid",
        price: 5000,
        coachId: null,
        coachName: null,
        paymentId: "payment-1",
        createdAt: "2024-01-14T10:00:00.000Z",
        payments: [
          {
            id: "payment-1",
            provider: "stripe",
            status: "completed",
            amount: 5000,
            createdAt: "2024-01-14T10:00:00.000Z",
          },
        ],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-1");
      const params = createParams("booking-1");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockBooking);
      expect(mockGetBookingById).toHaveBeenCalledWith("booking-1");
    });

    it("should return 404 for non-existent booking", async () => {
      mockGetBookingById.mockResolvedValue(null);

      const request = createRequest("non-existent");
      const params = createParams("non-existent");
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Booking not found" });
    });

    it("should return booking with coach details", async () => {
      const mockBooking = {
        id: "booking-6",
        userId: "user-5",
        userName: "Jane Player",
        userEmail: "player2@example.com",
        courtId: "court-7",
        courtName: "Pro Court 2",
        courtType: "padel",
        courtSurface: "professional",
        clubId: "club-3",
        clubName: "Elite Padel Academy",
        organizationId: "org-2",
        organizationName: "Tennis & Padel Corp",
        start: "2024-01-22T10:00:00.000Z",
        end: "2024-01-22T11:30:00.000Z",
        status: "paid",
        price: 10000,
        coachId: "coach-3",
        coachName: "Coach David Martinez",
        paymentId: "payment-4",
        createdAt: "2024-01-15T10:00:00.000Z",
        payments: [
          {
            id: "payment-4",
            provider: "stripe",
            status: "completed",
            amount: 10000,
            createdAt: "2024-01-15T10:00:00.000Z",
          },
        ],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-6");
      const params = createParams("booking-6");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.coachId).toBe("coach-3");
      expect(data.coachName).toBe("Coach David Martinez");
    });
  });

  describe("Organization admin", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "org-admin-id",
        isRoot: false,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });
    });

    it("should return booking for organization admin with access", async () => {
      const mockBooking = {
        id: "booking-1",
        userId: "user-4",
        userName: "John Player",
        userEmail: "player@example.com",
        courtId: "court-1",
        courtName: "Court 1",
        courtType: "padel",
        courtSurface: "artificial_grass",
        clubId: "club-1",
        clubName: "Downtown Padel Club",
        organizationId: "org-1",
        organizationName: "Padel Sports Inc",
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T11:00:00.000Z",
        status: "paid",
        price: 5000,
        coachId: null,
        coachName: null,
        paymentId: "payment-1",
        createdAt: "2024-01-14T10:00:00.000Z",
        payments: [],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-1");
      const params = createParams("booking-1");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("booking-1");
    });

    it("should return 404 for booking in different organization", async () => {
      const mockBooking = {
        id: "booking-other-org",
        organizationId: "org-2",
        clubId: "club-3",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-other-org");
      const params = createParams("booking-other-org");
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Booking not found" });
    });
  });

  describe("Club admin", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "club-admin-id",
        isRoot: false,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });
    });

    it("should return booking for club admin with access", async () => {
      const mockBooking = {
        id: "booking-1",
        userId: "user-4",
        userName: "John Player",
        userEmail: "player@example.com",
        courtId: "court-1",
        courtName: "Court 1",
        courtType: "padel",
        courtSurface: "artificial_grass",
        clubId: "club-1",
        clubName: "Downtown Padel Club",
        organizationId: "org-1",
        organizationName: "Padel Sports Inc",
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T11:00:00.000Z",
        status: "paid",
        price: 5000,
        coachId: null,
        coachName: null,
        paymentId: "payment-1",
        createdAt: "2024-01-14T10:00:00.000Z",
        payments: [],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-1");
      const params = createParams("booking-1");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("booking-1");
    });

    it("should return 404 for booking in different club", async () => {
      const mockBooking = {
        id: "booking-other-club",
        clubId: "club-2",
        organizationId: "org-1",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-other-club");
      const params = createParams("booking-other-club");
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Booking not found" });
    });
  });

  describe("Booking statuses", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "root-user-id",
        isRoot: true,
        adminType: "root_admin",
        managedIds: [],
      });
    });

    it("should return booking with pending status", async () => {
      const mockBooking = {
        id: "booking-pending",
        status: "pending",
        paymentId: null,
        payments: [],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-pending");
      const params = createParams("booking-pending");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("pending");
      expect(data.paymentId).toBeNull();
      expect(data.payments).toEqual([]);
    });

    it("should return booking with cancelled status", async () => {
      const mockBooking = {
        id: "booking-cancelled",
        status: "cancelled",
        paymentId: null,
        payments: [],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-cancelled");
      const params = createParams("booking-cancelled");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("cancelled");
    });

    it("should return booking with reserved status", async () => {
      const mockBooking = {
        id: "booking-reserved",
        status: "reserved",
        paymentId: null,
        payments: [],
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-reserved");
      const params = createParams("booking-reserved");
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("reserved");
    });
  });
});

describe("PATCH /api/admin/bookings/:id (Mock Mode)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMockMode.mockReturnValue(true);
  });

  const createRequest = (id: string, body: Record<string, unknown>) => {
    const url = new URL(`http://localhost:3000/api/admin/bookings/${id}`);
    return new Request(url.toString(), {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  const createParams = (id: string) => Promise.resolve({ id });

  describe("Authorization", () => {
    it("should return 401 for unauthenticated users", async () => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = createRequest("booking-1", { status: "cancelled" });
      const params = createParams("booking-1");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(401);
    });
  });

  describe("Root admin", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "root-user-id",
        isRoot: true,
        adminType: "root_admin",
        managedIds: [],
      });
    });

    it("should update booking status to cancelled", async () => {
      const mockBooking = {
        id: "booking-1",
        clubId: "club-1",
        organizationId: "org-1",
        status: "paid",
      };

      const updatedBooking = {
        ...mockBooking,
        status: "cancelled",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);
      mockUpdateBookingById.mockResolvedValue(updatedBooking);

      const request = createRequest("booking-1", { status: "cancelled" });
      const params = createParams("booking-1");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("cancelled");
      expect(mockUpdateBookingById).toHaveBeenCalledWith("booking-1", { status: "cancelled" });
    });

    it("should return 404 for non-existent booking", async () => {
      mockGetBookingById.mockResolvedValue(null);

      const request = createRequest("non-existent", { status: "cancelled" });
      const params = createParams("non-existent");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Booking not found" });
    });

    it("should return 400 for invalid status", async () => {
      const request = createRequest("booking-1", { status: "invalid-status" });
      const params = createParams("booking-1");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid status");
    });

    it("should update booking status to pending", async () => {
      const mockBooking = {
        id: "booking-1",
        clubId: "club-1",
        organizationId: "org-1",
        status: "reserved",
      };

      const updatedBooking = {
        ...mockBooking,
        status: "pending",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);
      mockUpdateBookingById.mockResolvedValue(updatedBooking);

      const request = createRequest("booking-1", { status: "pending" });
      const params = createParams("booking-1");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("pending");
    });
  });

  describe("Organization admin", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "org-admin-id",
        isRoot: false,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });
    });

    it("should update booking in managed organization", async () => {
      const mockBooking = {
        id: "booking-1",
        clubId: "club-1",
        organizationId: "org-1",
        status: "paid",
      };

      const updatedBooking = {
        ...mockBooking,
        status: "cancelled",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);
      mockUpdateBookingById.mockResolvedValue(updatedBooking);

      const request = createRequest("booking-1", { status: "cancelled" });
      const params = createParams("booking-1");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("cancelled");
    });

    it("should return 404 for booking in different organization", async () => {
      const mockBooking = {
        id: "booking-other-org",
        clubId: "club-3",
        organizationId: "org-2",
        status: "paid",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-other-org", { status: "cancelled" });
      const params = createParams("booking-other-org");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Booking not found" });
    });
  });

  describe("Club admin", () => {
    beforeEach(() => {
      mockRequireAnyAdmin.mockResolvedValue({
        authorized: true,
        userId: "club-admin-id",
        isRoot: false,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });
    });

    it("should update booking in managed club", async () => {
      const mockBooking = {
        id: "booking-1",
        clubId: "club-1",
        organizationId: "org-1",
        status: "paid",
      };

      const updatedBooking = {
        ...mockBooking,
        status: "cancelled",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);
      mockUpdateBookingById.mockResolvedValue(updatedBooking);

      const request = createRequest("booking-1", { status: "cancelled" });
      const params = createParams("booking-1");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("cancelled");
    });

    it("should return 404 for booking in different club", async () => {
      const mockBooking = {
        id: "booking-other-club",
        clubId: "club-2",
        organizationId: "org-1",
        status: "paid",
      };

      mockGetBookingById.mockResolvedValue(mockBooking);

      const request = createRequest("booking-other-club", { status: "cancelled" });
      const params = createParams("booking-other-club");
      const response = await PATCH(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Booking not found" });
    });
  });
});
