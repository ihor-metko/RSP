import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { calculateBookingStatus, toBookingStatus, migrateLegacyStatus } from "@/utils/bookingStatus";
import { emitBookingUpdated, emitBookingDeleted } from "@/lib/socketEmitters";
import type { OperationsBooking } from "@/types/booking";
import { updateStatisticsForBooking } from "@/services/statisticsService";

/**
 * Booking detail response type
 */
export interface AdminBookingDetailResponse {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  courtId: string;
  courtName: string;
  courtType: string | null;
  courtSurface: string | null;
  clubId: string;
  clubName: string;
  organizationId: string | null;
  organizationName: string | null;
  start: string;
  end: string;
  status: string;
  price: number;
  coachId: string | null;
  coachName: string | null;
  paymentId: string | null;
  createdAt: string;
  payments: {
    id: string;
    provider: string;
    status: string;
    amount: number;
    createdAt: string;
  }[];
}

/**
 * Booking with included relations type
 */
interface BookingWithRelations {
  id: string;
  userId: string;
  courtId: string;
  coachId: string | null;
  start: Date;
  end: Date;
  status: string;
  price: number;
  paymentId: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  court: {
    id: string;
    name: string;
    type: string | null;
    surface: string | null;
    clubId: string;
    club: {
      id: string;
      name: string;
      organizationId: string | null;
      organization: {
        id: string;
        name: string;
      } | null;
    };
  };
  coach: {
    id: string;
    user: {
      name: string | null;
    };
  } | null;
  payments: {
    id: string;
    provider: string;
    status: string;
    amount: number;
    createdAt: Date;
  }[];
}

/**
 * Check if the admin has permission to access this booking
 */
async function checkBookingAccess(
  bookingId: string,
  adminType: string,
  managedIds: string[]
): Promise<{ hasAccess: boolean; booking: BookingWithRelations | null }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      court: {
        select: {
          id: true,
          name: true,
          type: true,
          surface: true,
          clubId: true,
          club: {
            select: {
              id: true,
              name: true,
              organizationId: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      coach: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      payments: {
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) {
    return { hasAccess: false, booking: null };
  }

  // Root admin has access to all bookings
  if (adminType === "root_admin") {
    return { hasAccess: true, booking };
  }

  // Organization admin can access bookings for clubs in their organizations
  if (adminType === "organization_admin") {
    const organizationId = booking.court.club.organizationId;
    if (organizationId && managedIds.includes(organizationId)) {
      return { hasAccess: true, booking };
    }
    return { hasAccess: false, booking: null };
  }

  // Club owner/admin can access bookings for their managed clubs
  if (adminType === "club_owner" || adminType === "club_admin") {
    const clubId = booking.court.clubId;
    if (managedIds.includes(clubId)) {
      return { hasAccess: true, booking };
    }
    return { hasAccess: false, booking: null };
  }

  return { hasAccess: false, booking: null };
}

/**
 * GET /api/admin/bookings/:id
 *
 * Get detailed information about a specific booking.
 * Permission check based on admin role.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AdminBookingDetailResponse | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;
  const { id } = await params;

  try {
    const { hasAccess, booking } = await checkBookingAccess(id, adminType, managedIds);

    if (!hasAccess || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const startISO = booking.start.toISOString();
    const endISO = booking.end.toISOString();

    // Calculate the display status based on time and persistent status
    const displayStatus = calculateBookingStatus(
      startISO,
      endISO,
      toBookingStatus(booking.status)
    );

    const response: AdminBookingDetailResponse = {
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      courtName: booking.court.name,
      courtType: booking.court.type,
      courtSurface: booking.court.surface,
      clubId: booking.court.clubId,
      clubName: booking.court.club.name,
      organizationId: booking.court.club.organizationId,
      organizationName: booking.court.club.organization?.name ?? null,
      start: startISO,
      end: endISO,
      status: displayStatus,
      price: booking.price,
      coachId: booking.coachId,
      coachName: booking.coach?.user.name ?? null,
      paymentId: booking.paymentId,
      createdAt: booking.createdAt.toISOString(),
      payments: booking.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching booking detail:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/bookings/:id
 *
 * Update a booking (edit or cancel).
 * Only allowed if user has permission for that booking.
 *
 * Request body:
 * - status: New status (e.g., "cancelled")
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AdminBookingDetailResponse | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    // Validate status if provided
    const validStatuses = ["pending", "paid", "cancelled", "reserved"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // First check if admin has access to this booking
    const { hasAccess, booking: existingBooking } = await checkBookingAccess(id, adminType, managedIds);

    if (!hasAccess || !existingBooking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Update the booking and recalculate statistics within a transaction
    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          ...(status && { status }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          court: {
            select: {
              id: true,
              name: true,
              type: true,
              surface: true,
              clubId: true,
              club: {
                select: {
                  id: true,
                  name: true,
                  organizationId: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          coach: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              provider: true,
              status: true,
              amount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      // Update daily statistics reactively within the transaction
      // This is important when status changes (e.g., to/from cancelled)
      await updateStatisticsForBooking(updated.court.clubId, updated.start, updated.end);

      return updated;
    });

    const startISO = updatedBooking.start.toISOString();
    const endISO = updatedBooking.end.toISOString();

    // Calculate the display status based on time and persistent status
    const displayStatus = calculateBookingStatus(
      startISO,
      endISO,
      toBookingStatus(updatedBooking.status)
    );

    // Emit Socket.IO event for real-time updates
    const { bookingStatus: newBookingStatus, paymentStatus: newPaymentStatus } = migrateLegacyStatus(updatedBooking.status);
    const operationsBooking: OperationsBooking = {
      id: updatedBooking.id,
      userId: updatedBooking.userId,
      userName: updatedBooking.user.name,
      userEmail: updatedBooking.user.email,
      courtId: updatedBooking.courtId,
      courtName: updatedBooking.court.name,
      start: startISO,
      end: endISO,
      bookingStatus: newBookingStatus,
      paymentStatus: newPaymentStatus,
      price: updatedBooking.price,
      sportType: (updatedBooking.sportType as OperationsBooking['sportType']) || "PADEL",
      coachId: updatedBooking.coachId,
      coachName: updatedBooking.coach?.user.name ?? null,
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.createdAt.toISOString(), // Use createdAt as version timestamp
    };

    emitBookingUpdated({
      booking: operationsBooking,
      clubId: updatedBooking.court.clubId,
      courtId: updatedBooking.courtId,
      previousStatus: existingBooking.status,
    });

    const response: AdminBookingDetailResponse = {
      id: updatedBooking.id,
      userId: updatedBooking.userId,
      userName: updatedBooking.user.name,
      userEmail: updatedBooking.user.email,
      courtId: updatedBooking.courtId,
      courtName: updatedBooking.court.name,
      courtType: updatedBooking.court.type,
      courtSurface: updatedBooking.court.surface,
      clubId: updatedBooking.court.clubId,
      clubName: updatedBooking.court.club.name,
      organizationId: updatedBooking.court.club.organizationId,
      organizationName: updatedBooking.court.club.organization?.name ?? null,
      start: startISO,
      end: endISO,
      status: displayStatus,
      price: updatedBooking.price,
      coachId: updatedBooking.coachId,
      coachName: updatedBooking.coach?.user.name ?? null,
      paymentId: updatedBooking.paymentId,
      createdAt: updatedBooking.createdAt.toISOString(),
      payments: updatedBooking.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating booking:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bookings/:id
 *
 * Delete a booking permanently.
 * Only allowed if user has permission for that booking.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;
  const { id } = await params;

  try {
    // First check if admin has access to this booking
    const { hasAccess, booking } = await checkBookingAccess(id, adminType, managedIds);

    if (!hasAccess || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Store club and court IDs and dates before deletion
    const clubId = booking.court.clubId;
    const courtId = booking.courtId;
    const bookingStart = booking.start;
    const bookingEnd = booking.end;

    // Delete the booking and update statistics within a transaction
    await prisma.$transaction(async (tx) => {
      await tx.booking.delete({
        where: { id },
      });

      // Update daily statistics reactively within the transaction
      await updateStatisticsForBooking(clubId, bookingStart, bookingEnd);
    });

    // Emit Socket.IO event for real-time updates (after deletion)
    emitBookingDeleted({
      bookingId: id,
      clubId,
      courtId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting booking:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
