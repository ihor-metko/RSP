/**
 * Tests for Payment Availability Integration in Booking Flow
 * 
 * Tests the integration of payment account availability into booking responses
 * and payment intent creation.
 */

import { prisma } from "@/lib/prisma";
import {
  getPaymentAvailabilityForBooking,
  resolvePaymentAccountForBooking,
} from "@/services/paymentAccountService";
import { PaymentProvider, PaymentAccountScope, PaymentAccountStatus } from "@/types/paymentAccount";
import { encrypt } from "@/lib/encryption";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: {
      findFirst: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Payment Availability Integration", () => {
  const mockClubId = "club-123";
  const mockOrganizationId = "org-456";
  const mockMerchantId = "merchant-789";
  const mockSecretKey = "secret-abc";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPaymentAvailabilityForBooking", () => {
    it("should return payment available with provider when active account exists", async () => {
      const mockAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        status: PaymentAccountStatus.ACTIVE,
        isActive: true,
        displayName: "Test Payment",
        lastVerifiedAt: new Date(),
        verificationError: null,
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockAccount);

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(true);
      expect(result.paymentProviders).toEqual(['wayforpay']);
    });

    it("should return payment not available when no account exists", async () => {
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: mockClubId,
        organizationId: mockOrganizationId,
      });

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(false);
      expect(result.paymentProviders).toBeUndefined();
    });

    it("should return payment not available when account is PENDING", async () => {
      const mockAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        status: PaymentAccountStatus.PENDING,
        displayName: "Test Payment",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockAccount);

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(false);
      expect(result.paymentProviders).toBeUndefined();
    });

    it("should return payment not available when account is INVALID", async () => {
      const mockAccount = {
        id: "account-1",
        provider: PaymentProvider.LIQPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        status: PaymentAccountStatus.INVALID,
        displayName: "Test Payment",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockAccount);

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(false);
      expect(result.paymentProviders).toBeUndefined();
    });

    it("should return payment not available when account is DISABLED", async () => {
      const mockAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.ORGANIZATION,
        clubId: null,
        organizationId: mockOrganizationId,
        status: PaymentAccountStatus.DISABLED,
        displayName: "Test Payment",
      };

      (prisma.paymentAccount.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No club-level
        .mockResolvedValueOnce(mockAccount); // Org-level disabled
      
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: mockClubId,
        organizationId: mockOrganizationId,
      });

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(false);
      expect(result.paymentProviders).toBeUndefined();
    });

    it("should use club-level account over organization-level when both exist", async () => {
      const mockClubAccount = {
        id: "account-club",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        status: PaymentAccountStatus.ACTIVE,
        displayName: "Club Payment",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockClubAccount);

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(true);
      expect(result.paymentProviders).toEqual(['wayforpay']);
      
      // Should not check organization-level since club-level was found
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.club.findUnique).not.toHaveBeenCalled();
    });

    it("should fallback to organization-level when club-level doesn't exist", async () => {
      const mockOrgAccount = {
        id: "account-org",
        provider: PaymentProvider.LIQPAY,
        scope: PaymentAccountScope.ORGANIZATION,
        clubId: null,
        organizationId: mockOrganizationId,
        status: PaymentAccountStatus.ACTIVE,
        displayName: "Org Payment",
      };

      (prisma.paymentAccount.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No club-level
        .mockResolvedValueOnce(mockOrgAccount); // Org-level exists
      
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: mockClubId,
        organizationId: mockOrganizationId,
      });

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(true);
      expect(result.paymentProviders).toEqual(['liqpay']);
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.club.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should map LIQPAY provider to lowercase 'liqpay'", async () => {
      const mockAccount = {
        id: "account-1",
        provider: PaymentProvider.LIQPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        status: PaymentAccountStatus.ACTIVE,
        displayName: "LiqPay Account",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockAccount);

      const result = await getPaymentAvailabilityForBooking(mockClubId);

      expect(result.paymentAvailable).toBe(true);
      expect(result.paymentProviders).toEqual(['liqpay']);
    });
  });

  describe("Payment Account Resolution Security", () => {
    it("should only consider ACTIVE status accounts for payment", async () => {
      const mockPendingAccount = {
        id: "account-pending",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        status: PaymentAccountStatus.PENDING,
        isActive: true,
        displayName: "Pending Payment",
        lastVerifiedAt: null,
        verificationError: null,
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No ACTIVE club account
        .mockResolvedValueOnce(null); // No ACTIVE org account
      
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: mockClubId,
        organizationId: mockOrganizationId,
      });

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();
    });

    it("should re-evaluate payment availability (not cache)", async () => {
      const mockAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        status: PaymentAccountStatus.ACTIVE,
        displayName: "Test Payment",
      };

      // First call
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockAccount);
      const result1 = await getPaymentAvailabilityForBooking(mockClubId);
      expect(result1.paymentAvailable).toBe(true);

      // Second call should query database again (no caching)
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: mockClubId,
        organizationId: mockOrganizationId,
      });
      
      const result2 = await getPaymentAvailabilityForBooking(mockClubId);
      expect(result2.paymentAvailable).toBe(false);

      // Verify database was queried both times
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(3); // 1 + 2 (club + org)
    });
  });
});
