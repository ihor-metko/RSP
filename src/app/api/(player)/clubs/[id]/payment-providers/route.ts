import { NextResponse } from "next/server";
import { getPaymentAccountStatus } from "@/services/paymentAccountService";
import { PaymentProvider } from "@/types/paymentAccount";

/**
 * GET /api/clubs/[id]/payment-providers
 *
 * Get available payment providers for a club (player-facing).
 * Returns list of configured and verified payment providers with their logos.
 * No sensitive data is exposed.
 *
 * Access: Public (no authentication required for browsing)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const clubId = resolvedParams.id;

  try {
    // Get payment account status for the club
    const status = await getPaymentAccountStatus(clubId);

    // Only return providers that have completed real payment verification (VERIFIED status)
    // Empty list is returned if:
    // - No payment account is configured (!status.isConfigured)
    // - Payment account is not verified (!status.isAvailable)
    // - Provider is not set (!status.provider)
    if (!status.isConfigured || !status.isAvailable || !status.provider) {
      return NextResponse.json({
        providers: [],
        message: status.isConfigured && !status.isAvailable
          ? "Payment provider not yet verified"
          : "No payment provider configured",
      });
    }

    // Map provider to display information with logos
    const providerInfo = getProviderDisplayInfo(status.provider);

    return NextResponse.json({
      providers: [
        {
          id: status.provider,
          name: providerInfo.name,
          displayName: status.displayName || providerInfo.name,
          logoLight: providerInfo.logoLight,
          logoDark: providerInfo.logoDark,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching payment providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment providers" },
      { status: 500 }
    );
  }
}

/**
 * Get display information for a payment provider
 * Including theme-based logos
 */
function getProviderDisplayInfo(provider: PaymentProvider): {
  name: string;
  logoLight: string;
  logoDark: string;
} {
  switch (provider) {
    case PaymentProvider.WAYFORPAY:
      return {
        name: "WayForPay",
        logoLight: "/images/payment-providers/wayforpay-light.svg",
        logoDark: "/images/payment-providers/wayforpay-dark.svg",
      };
    case PaymentProvider.LIQPAY:
      return {
        name: "LiqPay",
        logoLight: "/images/payment-providers/liqpay-light.svg",
        logoDark: "/images/payment-providers/liqpay-dark.svg",
      };
    default:
      return {
        name: provider,
        logoLight: "/images/payment-providers/default-light.svg",
        logoDark: "/images/payment-providers/default-dark.svg",
      };
  }
}
