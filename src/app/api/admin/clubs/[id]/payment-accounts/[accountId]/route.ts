import { NextResponse } from "next/server";
import { requireClubOwner } from "@/lib/requireRole";
import { logAudit } from "@/lib/auditLog";
import {
  getMaskedPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
} from "@/services/paymentAccountService";
import {
  PaymentAccountCredentials,
} from "@/types/paymentAccount";

/**
 * GET /api/admin/clubs/[id]/payment-accounts/[accountId]
 * 
 * Get a specific payment account (masked, no sensitive data).
 * 
 * Access: Club Owner, Root Admin (but only sees masked data)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const resolvedParams = await params;
  const { id: clubId, accountId } = resolvedParams;

  const authResult = await requireClubOwner(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const paymentAccount = await getMaskedPaymentAccount(accountId);

    if (!paymentAccount) {
      return NextResponse.json(
        { error: "Payment account not found" },
        { status: 404 }
      );
    }

    // Verify the account belongs to this club
    if (paymentAccount.clubId !== clubId) {
      return NextResponse.json(
        { error: "Payment account does not belong to this club" },
        { status: 403 }
      );
    }

    return NextResponse.json({ paymentAccount });
  } catch (error) {
    console.error("Error fetching payment account:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment account" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/clubs/[id]/payment-accounts/[accountId]
 * 
 * Update payment account credentials.
 * Root Admin has no access per security requirements.
 * 
 * Access: Club Owner only
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const resolvedParams = await params;
  const { id: clubId, accountId } = resolvedParams;

  const authResult = await requireClubOwner(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Root admins cannot update payment credentials
  if (authResult.isRoot) {
    return NextResponse.json(
      { error: "Root admins cannot access payment account credentials" },
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

    const body = await request.json();
    const { merchantId, secretKey, providerConfig, displayName, isActive } = body;

    // Build update credentials
    const credentials: Partial<PaymentAccountCredentials> = {};
    
    if (merchantId !== undefined) credentials.merchantId = merchantId;
    if (secretKey !== undefined) credentials.secretKey = secretKey;
    if (providerConfig !== undefined) credentials.providerConfig = providerConfig;
    if (displayName !== undefined) credentials.displayName = displayName;
    if (isActive !== undefined) credentials.isActive = isActive;

    const updatedAccount = await updatePaymentAccount(
      accountId,
      credentials,
      authResult.userId
    );

    // Log audit event
    await logAudit({
      actorId: authResult.userId,
      action: "payment_account.update",
      targetType: "club",
      targetId: clubId,
      detail: JSON.stringify({
        paymentAccountId: accountId,
        fieldsUpdated: Object.keys(credentials),
      }),
    });

    return NextResponse.json({
      message: "Payment account updated successfully",
      paymentAccount: updatedAccount,
    });
  } catch (error) {
    console.error("Error updating payment account:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update payment account" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clubs/[id]/payment-accounts/[accountId]
 * 
 * Delete a payment account permanently.
 * Consider using deactivate (PUT with isActive: false) instead for safety.
 * 
 * Access: Club Owner only
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const resolvedParams = await params;
  const { id: clubId, accountId } = resolvedParams;

  const authResult = await requireClubOwner(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Root admins cannot delete payment accounts
  if (authResult.isRoot) {
    return NextResponse.json(
      { error: "Root admins cannot manage payment account credentials" },
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

    await deletePaymentAccount(accountId);

    // Log audit event
    await logAudit({
      actorId: authResult.userId,
      action: "payment_account.delete",
      targetType: "club",
      targetId: clubId,
      detail: JSON.stringify({
        paymentAccountId: accountId,
        provider: existingAccount.provider,
      }),
    });

    return NextResponse.json({
      message: "Payment account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment account:", error);
    return NextResponse.json(
      { error: "Failed to delete payment account" },
      { status: 500 }
    );
  }
}
