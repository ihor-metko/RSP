import { NextResponse } from "next/server";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { auditLog } from "@/lib/auditLog";
import {
  getMaskedPaymentAccount,
  retryPaymentAccountVerification,
} from "@/services/paymentAccountService";

/**
 * POST /api/admin/organizations/[id]/payment-accounts/[accountId]/verify
 * 
 * Manually trigger verification for a payment account.
 * 
 * Access: Organization Admin (includes owners)
 * Note: requireOrganizationAdmin is used intentionally to allow all organization
 * admins (including owners) to retry verification, as this is a management function.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const resolvedParams = await params;
  const { id: organizationId, accountId } = resolvedParams;

  const authResult = await requireOrganizationAdmin(organizationId);

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
    // Verify the account exists and belongs to this organization
    const existingAccount = await getMaskedPaymentAccount(accountId);
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: "Payment account not found" },
        { status: 404 }
      );
    }

    if (existingAccount.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Payment account does not belong to this organization" },
        { status: 403 }
      );
    }

    // Trigger verification (sets status to PENDING and enqueues async verification)
    const updatedAccount = await retryPaymentAccountVerification(accountId);

    // Log audit event
    await auditLog(
      authResult.userId,
      "payment_account.verify",
      "organization",
      organizationId,
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
