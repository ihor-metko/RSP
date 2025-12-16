import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import { getPaymentAccountStatus } from "@/services/paymentAccountService";

/**
 * GET /api/admin/clubs/[id]/payment-accounts/status
 * 
 * Get payment account status for a club.
 * Returns whether payment processing is configured (masked, no sensitive data).
 * 
 * This endpoint can be used by booking flows to determine if payments are possible.
 * 
 * Access: Any authenticated user
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const clubId = resolvedParams.id;

  // Only require authentication - any user can check if payments are configured
  const authResult = await requireAuth(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const status = await getPaymentAccountStatus(clubId);

    return NextResponse.json({
      clubId,
      status,
    });
  } catch (error) {
    console.error("Error fetching payment account status:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment account status" },
      { status: 500 }
    );
  }
}
