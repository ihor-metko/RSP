import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { emitBookingCreated } from "@/lib/socketEmitters";
import type { OperationsBooking } from "@/types/booking";
import { migrateLegacyStatus } from "@/utils/bookingStatus";
import { DEFAULT_SPORT_TYPE } from "@/constants/sports";

/**
 * POST /api/admin/bookings/create
 * Create a booking as an admin (no payment required)
 * Admins can book for any user
 */
export async function POST(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const {
      userId,
      courtId,
      startTime,
      endTime,
      clubId, // Optional: for validation
    } = body;

    // Validate required fields
    if (!userId || !courtId || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields: userId, courtId, startTime, endTime" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }
    
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Fetch court details with club
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: {
        id: true,
        sportType: true,
        defaultPriceCents: true,
        club: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!court) {
      return NextResponse.json(
        { error: "Court not found" },
        { status: 404 }
      );
    }

    // Validate clubId if provided
    if (clubId && court.club.id !== clubId) {
      return NextResponse.json(
        { error: "Court does not belong to the specified club" },
        { status: 400 }
      );
    }

    // Check admin permissions
    if (authResult.adminType === "club_admin") {
      // Club admin can only book for their managed clubs
      if (!authResult.managedIds.includes(court.club.id)) {
        return NextResponse.json(
          { error: "You don't have permission to create bookings for this club" },
          { status: 403 }
        );
      }
    } else if (authResult.adminType === "organization_admin") {
      // Org admin can only book for clubs in their managed organizations
      if (!authResult.managedIds.includes(court.club.organizationId!)) {
        return NextResponse.json(
          { error: "You don't have permission to create bookings for this organization" },
          { status: 403 }
        );
      }
    }
    // Root admin has access to all

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, blocked: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.blocked) {
      return NextResponse.json(
        { error: "User is blocked and cannot make bookings" },
        { status: 403 }
      );
    }

    // Check for conflicting bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId,
        status: {
          in: ["pending", "paid", "reserved"],
        },
        OR: [
          {
            AND: [
              { start: { lte: start } },
              { end: { gt: start } },
            ],
          },
          {
            AND: [
              { start: { lt: end } },
              { end: { gte: end } },
            ],
          },
          {
            AND: [
              { start: { gte: start } },
              { end: { lte: end } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: "This time slot is already booked" },
        { status: 409 }
      );
    }

    // Get price for the booking
    const durationMinutes = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60)
    );

    // Fetch price timeline
    const startTimeStr = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
    const dateStr = start.toISOString().split("T")[0];

    let priceCents = Math.round((court.defaultPriceCents / 60) * durationMinutes);

    try {
      // Use base URL from environment, fallback to relative URL for server-side calls
      const baseUrl = process.env.NEXTAUTH_URL || "";
      const priceResponse = await fetch(
        `${baseUrl}/api/courts/${courtId}/price-timeline?date=${dateStr}`
      );
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        const segment = priceData.timeline.find(
          (seg: { start: string; end: string; priceCents: number }) =>
            startTimeStr >= seg.start && startTimeStr < seg.end
        );
        if (segment) {
          priceCents = Math.round((segment.priceCents / 60) * durationMinutes);
        }
      }
    } catch {
      // Fallback to default price
    }

    // Create booking with 'reserved' status (admin bookings don't require payment)
    const booking = await prisma.booking.create({
      data: {
        userId,
        courtId,
        start,
        end,
        price: priceCents,
        sportType: court.sportType || "PADEL",
        status: "reserved", // Admin bookings are automatically reserved
      },
      include: {
        court: {
          select: {
            name: true,
            club: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit Socket.IO event for real-time updates
    const { bookingStatus, paymentStatus } = migrateLegacyStatus(booking.status);
    const operationsBooking: OperationsBooking = {
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      courtName: booking.court.name,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      bookingStatus,
      paymentStatus,
      price: booking.price,
      sportType: (booking.sportType as OperationsBooking['sportType']) || DEFAULT_SPORT_TYPE,
      coachId: null,
      coachName: null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.createdAt.toISOString(), // Use createdAt as version timestamp
    };

    emitBookingCreated({
      booking: operationsBooking,
      clubId: booking.court.club.id,
      courtId: booking.courtId,
    });

    return NextResponse.json(
      {
        bookingId: booking.id,
        courtId: booking.courtId,
        courtName: booking.court.name,
        clubName: booking.court.club.name,
        userName: booking.user.name,
        userEmail: booking.user.email,
        startTime: booking.start.toISOString(),
        endTime: booking.end.toISOString(),
        price: booking.price,
        status: booking.status,
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating admin booking:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
