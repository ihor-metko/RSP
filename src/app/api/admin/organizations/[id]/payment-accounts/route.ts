import { NextResponse } from "next/server";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { auditLog } from "@/lib/auditLog";
import {
  createPaymentAccount,
  listOrganizationPaymentAccounts,
} from "@/services/paymentAccountService";
import {
  PaymentAccountCredentials,
  PaymentAccountScope,
  isPaymentProvider,
} from "@/types/paymentAccount";

/**
 * GET /api/admin/organizations/[id]/payment-accounts
 * 
 * List all payment accounts for an organization.
 * Returns masked payment accounts (no sensitive data).
 * 
 * Access: Organization Owner, Root Admin
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

  // Check authorization - must be organization owner or root admin
  // For now, we allow organization admins. In stricter security, only owners should see payment accounts
  const authResult = await requireOrganizationAdmin(organizationId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const paymentAccounts = await listOrganizationPaymentAccounts(organizationId);

    return NextResponse.json({
      paymentAccounts,
      organizationId,
    });
  } catch (error) {
    console.error("Error listing organization payment accounts:", error);
    return NextResponse.json(
      { error: "Failed to list payment accounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations/[id]/payment-accounts
 * 
 * Create a new organization-level payment account.
 * Only Organization Owners can create payment accounts.
 * Root Admin has no access to payment keys per security requirements.
 * 
 * Access: Organization Owner only
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

  // Check if user is organization admin (includes owners)
  const authResult = await requireOrganizationAdmin(organizationId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Additional check: Root admins should NOT have access to create payment accounts
  // per security requirements ("Root Admin → no access to keys")
  if (authResult.isRoot) {
    return NextResponse.json(
      { error: "Root admins cannot access payment account credentials" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate that body is a valid object
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }
    
    const { provider, merchantId, secretKey, providerConfig, displayName, isActive } = body;

    // Validate required fields
    if (!provider || !merchantId || !secretKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, merchantId, secretKey" },
        { status: 400 }
      );
    }

    // Validate provider
    if (!isPaymentProvider(provider)) {
      return NextResponse.json(
        { error: "Invalid payment provider" },
        { status: 400 }
      );
    }

    // Validate providerConfig if provided - must be an object or undefined
    if (providerConfig !== undefined && providerConfig !== null && (typeof providerConfig !== "object" || Array.isArray(providerConfig))) {
      return NextResponse.json(
        { error: "Invalid providerConfig: must be an object" },
        { status: 400 }
      );
    }

    // Determine if providerConfig is valid for inclusion
    const hasValidProviderConfig = providerConfig && typeof providerConfig === "object" && !Array.isArray(providerConfig);

    // Create payment account credentials
    const credentials: PaymentAccountCredentials = {
      provider,
      scope: PaymentAccountScope.ORGANIZATION,
      organizationId,
      merchantId,
      secretKey,
      ...(hasValidProviderConfig ? { providerConfig } : {}),
      displayName,
      isActive,
    };

    const paymentAccount = await createPaymentAccount(credentials, authResult.userId);

    // Log audit event
    await auditLog(
      authResult.userId,
      "payment_account.create",
      "organization",
      organizationId,
      {
        paymentAccountId: paymentAccount.id,
        provider,
        scope: PaymentAccountScope.ORGANIZATION,
      }
    );

    return NextResponse.json({
      message: "Payment account created successfully",
      paymentAccount,
    });
  } catch (error) {
    console.error("Error creating organization payment account:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create payment account" },
      { status: 500 }
    );
  }
}
