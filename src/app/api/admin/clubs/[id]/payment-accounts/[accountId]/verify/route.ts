import { NextResponse } from "next/server";
import { requireClubOwner } from "@/lib/requireRole";
import { auditLog } from "@/lib/auditLog";
import {
  getMaskedPaymentAccount,
  retryPaymentAccountVerification,
} from "@/services/paymentAccountService";

/**
 * POST /api/admin/clubs/[id]/payment-accounts/[accountId]/verify
 * 
 * Manually trigger verification for a payment account.
 * 
 * Access: Club Owner only
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const resolvedParams = await params;
  const { id: clubId, accountId } = resolvedParams;

  const authResult = await requireClubOwner(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Root admins cannot trigger verification (no access to credentials)
  if (authResult.isRoot) {
    return NextResponse.json(
      { error: "Root admins cannot verify payment accounts" },
      { status: 403 }
    );
  }

  try {
    // Verify the account exists and belongs to this club
    const existingAccount = await getMaskedPaymentAccount(accountId);
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: "Payment account not found" },
        { status: 404 }
      );
    }

    if (existingAccount.clubId !== clubId) {
      return NextResponse.json(
        { error: "Payment account does not belong to this club" },
        { status: 403 }
      );
    }

    // Trigger verification (sets status to PENDING and enqueues async verification)
    const updatedAccount = await retryPaymentAccountVerification(accountId);

    // Log audit event
    await auditLog(
      authResult.userId,
      "payment_account.verify",
      "club",
      clubId,
      {
        paymentAccountId: accountId,
      }
    );

    return NextResponse.json({
      message: "Payment account verification started",
      paymentAccount: updatedAccount,
    });
  } catch (error) {
    console.error("Error verifying payment account:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to verify payment account" },
      { status: 500 }
    );
  }
}
