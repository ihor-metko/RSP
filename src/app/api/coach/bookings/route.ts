import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/**
 * GET /api/coach/bookings?date=YYYY-MM-DD
 * Fetch bookings assigned to the authenticated coach for a specific date
 */
export async function GET(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Validate date parameter
    if (!dateParam) {
      return NextResponse.json(
        { error: "Missing required parameter: date" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Parse date and create start/end of day
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(dateParam);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setHours(23, 59, 59, 999);

    // Find the coach record for the authenticated user
    const coach = await prisma.coach.findFirst({
      where: { userId: authResult.userId },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    // Fetch bookings for the coach on the specified date
    const bookings = await prisma.booking.findMany({
      where: {
        coachId: coach.id,
        start: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        start: "asc",
      },
    });

    // Transform bookings to match the API response format
    const formattedBookings = bookings.map((booking) => {
      const durationMinutes = Math.round(
        (booking.end.getTime() - booking.start.getTime()) / (1000 * 60)
      );

      return {
        bookingId: booking.id,
        playerName: booking.user.name || "Unknown Player",
        playerContact: booking.user.email,
        courtName: booking.court.name,
        date: dateParam,
        time: booking.start.toTimeString().slice(0, 5), // HH:MM format
        duration: durationMinutes,
        status: booking.status,
      };
    });

    return NextResponse.json(formattedBookings);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching coach bookings:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
