/**
 * Tests for Payment Account Resolution Logic
 * 
 * Tests the critical payment resolution strategy:
 * 1. Check for active club-level payment account
 * 2. Fallback to organization-level payment account
 * 3. Return null if no payment account is configured
 */

import { prisma } from "@/lib/prisma";
import {
  resolvePaymentAccountForBooking,
  getPaymentAccountStatus,
} from "@/services/paymentAccountService";
import { PaymentProvider, PaymentAccountScope } from "@/types/paymentAccount";
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

describe("Payment Account Resolution", () => {
  const mockClubId = "club-123";
  const mockOrganizationId = "org-456";
  const mockMerchantId = "merchant-789";
  const mockSecretKey = "secret-abc";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolvePaymentAccountForBooking", () => {
    it("should resolve club-level payment account when available", async () => {
      const mockClubAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        isActive: true,
        displayName: "Club Payment",
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockClubAccount);

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe(PaymentProvider.WAYFORPAY);
      expect(result?.scope).toBe(PaymentAccountScope.CLUB);
      expect(result?.merchantId).toBe(mockMerchantId);
      expect(result?.secretKey).toBe(mockSecretKey);

      // Should only check club-level, not organization-level
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.club.findUnique).not.toHaveBeenCalled();
    });

    it("should fallback to organization-level when club-level not found", async () => {
      const mockOrgAccount = {
        id: "account-2",
        provider: PaymentProvider.LIQPAY,
        scope: PaymentAccountScope.ORGANIZATION,
        clubId: null,
        organizationId: mockOrganizationId,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        isActive: true,
        displayName: "Org Payment",
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      // No club-level account
      (prisma.paymentAccount.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOrgAccount);

      // Club belongs to organization
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      });

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe(PaymentProvider.LIQPAY);
      expect(result?.scope).toBe(PaymentAccountScope.ORGANIZATION);
      expect(result?.merchantId).toBe(mockMerchantId);
      expect(result?.secretKey).toBe(mockSecretKey);

      // Should check both levels
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.club.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should return null when no payment account is configured", async () => {
      // No club-level account
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);

      // Club belongs to organization
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      });

      // No org-level account
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();
    });

    it("should return null when club has no organization", async () => {
      // No club-level account
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);

      // Club has no organization
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: null,
      });

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();

      // Should not check org-level if club has no org
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(1);
    });

    it("should filter by provider when specified", async () => {
      const mockClubAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        isActive: true,
        displayName: "Club Payment",
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockClubAccount);

      const result = await resolvePaymentAccountForBooking(mockClubId, PaymentProvider.WAYFORPAY);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe(PaymentProvider.WAYFORPAY);

      // Check that provider filter was passed
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: PaymentProvider.WAYFORPAY,
          }),
        })
      );
    });

    it("should prioritize club-level over organization-level", async () => {
      // Both club and org accounts exist
      const mockClubAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt("club-merchant"),
        secretKey: encrypt("club-secret"),
        providerConfig: null,
        isActive: true,
        displayName: "Club Payment",
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockClubAccount);

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).not.toBeNull();
      expect(result?.scope).toBe(PaymentAccountScope.CLUB);
      expect(result?.merchantId).toBe("club-merchant");

      // Should stop at club level, not check org level
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.club.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("getPaymentAccountStatus", () => {
    it("should return configured status with club-level account", async () => {
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce({
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        displayName: "Club Payment",
      });

      const status = await getPaymentAccountStatus(mockClubId);

      expect(status.isConfigured).toBe(true);
      expect(status.provider).toBe(PaymentProvider.WAYFORPAY);
      expect(status.scope).toBe(PaymentAccountScope.CLUB);
      expect(status.displayName).toBe("Club Payment");
    });

    it("should return configured status with org-level account", async () => {
      // No club-level
      (prisma.paymentAccount.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          provider: PaymentProvider.LIQPAY,
          scope: PaymentAccountScope.ORGANIZATION,
          displayName: "Org Payment",
        });

      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      });

      const status = await getPaymentAccountStatus(mockClubId);

      expect(status.isConfigured).toBe(true);
      expect(status.provider).toBe(PaymentProvider.LIQPAY);
      expect(status.scope).toBe(PaymentAccountScope.ORGANIZATION);
    });

    it("should return not configured when no account exists", async () => {
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      });

      const status = await getPaymentAccountStatus(mockClubId);

      expect(status.isConfigured).toBe(false);
      expect(status.provider).toBeNull();
      expect(status.scope).toBeNull();
      expect(status.displayName).toBeNull();
    });
  });
});
