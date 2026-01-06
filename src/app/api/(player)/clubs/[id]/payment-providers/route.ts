import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentProvider, PaymentAccountScope } from "@/types/paymentAccount";

/**
 * Payment provider metadata configuration
 * Contains display information and theme-based logos for each provider
 */
const PAYMENT_PROVIDER_METADATA: Record<
  PaymentProvider,
  {
    name: string;
    logoLight: string;
    logoDark: string;
  }
> = {
  [PaymentProvider.WAYFORPAY]: {
    name: "WayForPay",
    logoLight: "/logos/payment/wayforpay-light.svg",
    logoDark: "/logos/payment/wayforpay-dark.svg",
  },
  [PaymentProvider.LIQPAY]: {
    name: "LiqPay",
    logoLight: "/logos/payment/liqpay-light.svg",
    logoDark: "/logos/payment/liqpay-dark.svg",
  },
};

export interface PaymentProviderInfo {
  id: string; // Provider enum value
  name: string;
  logoLight: string;
  logoDark: string;
}

/**
 * GET /api/(player)/clubs/[id]/payment-providers
 * 
 * Get available payment providers for a club.
 * Returns list of payment providers configured and verified for the club.
 * Only returns providers with VERIFIED verification level.
 * 
 * Access: Public (no authentication required for player booking flow)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Step 1: Check for club-level payment accounts with VERIFIED status
    const clubPaymentAccounts = await prisma.paymentAccount.findMany({
      where: {
        clubId,
        scope: PaymentAccountScope.CLUB,
        verificationLevel: "VERIFIED", // Only verified accounts
      },
      select: {
        provider: true,
      },
      distinct: ["provider"],
    });

    // Step 2: If no club-level accounts, check organization-level
    let providers: PaymentProvider[] = clubPaymentAccounts.map(
      (account) => account.provider as PaymentProvider
    );

    if (providers.length === 0) {
      // Get club's organization
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { organizationId: true },
      });

      if (club?.organizationId) {
        const orgPaymentAccounts = await prisma.paymentAccount.findMany({
          where: {
            organizationId: club.organizationId,
            scope: PaymentAccountScope.ORGANIZATION,
            verificationLevel: "VERIFIED", // Only verified accounts
          },
          select: {
            provider: true,
          },
          distinct: ["provider"],
        });

        providers = orgPaymentAccounts.map(
          (account) => account.provider as PaymentProvider
        );
      }
    }

    // Step 3: Map providers to their metadata
    const paymentProviders: PaymentProviderInfo[] = providers.map((provider) => {
      const metadata = PAYMENT_PROVIDER_METADATA[provider];
      return {
        id: provider,
        name: metadata.name,
        logoLight: metadata.logoLight,
        logoDark: metadata.logoDark,
      };
    });

    return NextResponse.json({
      providers: paymentProviders,
    });
  } catch (error) {
    console.error("Error fetching payment providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment providers" },
      { status: 500 }
    );
  }
}
