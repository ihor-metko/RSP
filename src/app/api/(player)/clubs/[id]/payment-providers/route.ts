import { NextResponse } from "next/server";
import { getPaymentAccountStatus } from "@/services/paymentAccountService";
import { PaymentProvider } from "@/types/paymentAccount";

/**
 * GET /api/clubs/[id]/payment-providers
 * 
 * Get available payment providers for a club.
 * Returns provider information including theme-based logos for the booking flow.
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

    // If no payment account is configured or not available, return empty array
    if (!status.isConfigured || !status.isAvailable || !status.provider) {
      return NextResponse.json({
        providers: [],
      });
    }

    // Map provider enum to display information
    const providerInfo = getProviderInfo(status.provider);

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
 * Get provider display information including logo paths
 */
function getProviderInfo(provider: PaymentProvider): {
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
        name: "Unknown Provider",
        logoLight: "/images/payment-providers/default-light.svg",
        logoDark: "/images/payment-providers/default-dark.svg",
      };
  }
}
