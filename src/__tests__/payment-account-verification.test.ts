/**
 * Tests for Payment Account Verification
 * 
 * Tests the verification flow for payment accounts:
 * 1. Verification updates status correctly
 * 2. Only ACTIVE accounts can be used for payments
 * 3. Failed verification sets INVALID status
 */

import { prisma } from "@/lib/prisma";
import {
  verifyPaymentAccount,
  resolvePaymentAccountForBooking,
} from "@/services/paymentAccountService";
import { PaymentProvider, PaymentAccountScope, PaymentAccountStatus } from "@/types/paymentAccount";
import { encrypt } from "@/lib/encryption";
import { getPaymentProviderVerifier } from "@/services/paymentProviders";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock payment provider verifiers
jest.mock("@/services/paymentProviders", () => ({
  getPaymentProviderVerifier: jest.fn(),
}));

describe("Payment Account Verification", () => {
  const mockAccountId = "account-123";
  const mockClubId = "club-456";
  const mockMerchantId = "merchant-789";
  const mockSecretKey = "secret-abc";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyPaymentAccount", () => {
    it("should update status to ACTIVE on successful verification", async () => {
      const mockAccount = {
        id: mockAccountId,
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        status: PaymentAccountStatus.PENDING,
        isActive: true,
        displayName: "Test Account",
        lastVerifiedAt: null,
        verificationError: null,
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findUnique as jest.Mock).mockResolvedValueOnce(mockAccount);
      (prisma.paymentAccount.update as jest.Mock).mockResolvedValueOnce({
        ...mockAccount,
        status: PaymentAccountStatus.ACTIVE,
        lastVerifiedAt: new Date(),
      });

      const mockVerifier = {
        provider: PaymentProvider.WAYFORPAY,
        verify: jest.fn().mockResolvedValueOnce({
          success: true,
          timestamp: new Date(),
        }),
      };

      (getPaymentProviderVerifier as jest.Mock).mockReturnValueOnce(mockVerifier);

      const result = await verifyPaymentAccount(mockAccountId);

      expect(result.success).toBe(true);
      expect(mockVerifier.verify).toHaveBeenCalledWith(
        mockMerchantId,
        mockSecretKey,
        null
      );
      expect(prisma.paymentAccount.update).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: expect.objectContaining({
          status: PaymentAccountStatus.ACTIVE,
          verificationError: null,
        }),
      });
    });

    it("should update status to INVALID on failed verification", async () => {
      const mockAccount = {
        id: mockAccountId,
        provider: PaymentProvider.LIQPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        status: PaymentAccountStatus.PENDING,
        isActive: true,
        displayName: "Test Account",
        lastVerifiedAt: null,
        verificationError: null,
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findUnique as jest.Mock).mockResolvedValueOnce(mockAccount);
      (prisma.paymentAccount.update as jest.Mock).mockResolvedValueOnce({
        ...mockAccount,
        status: PaymentAccountStatus.INVALID,
        verificationError: "Invalid credentials",
      });

      const mockVerifier = {
        provider: PaymentProvider.LIQPAY,
        verify: jest.fn().mockResolvedValueOnce({
          success: false,
          error: "Invalid credentials",
          errorCode: "INVALID_CREDENTIALS",
          timestamp: new Date(),
        }),
      };

      (getPaymentProviderVerifier as jest.Mock).mockReturnValueOnce(mockVerifier);

      const result = await verifyPaymentAccount(mockAccountId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
      expect(prisma.paymentAccount.update).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: expect.objectContaining({
          status: PaymentAccountStatus.INVALID,
          verificationError: "Invalid credentials",
        }),
      });
    });

    it("should throw error when account not found", async () => {
      (prisma.paymentAccount.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(verifyPaymentAccount(mockAccountId)).rejects.toThrow(
        "Payment account not found"
      );
    });
  });

  describe("Payment resolution with status", () => {
    it("should not resolve PENDING payment accounts", async () => {
      const mockPendingAccount = {
        id: mockAccountId,
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        status: PaymentAccountStatus.PENDING,
        isActive: true,
      };

      // No active account found (PENDING is filtered out)
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: null,
      });

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();
      
      // Verify that status filter was applied
      expect(prisma.paymentAccount.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PaymentAccountStatus.ACTIVE,
          }),
        })
      );
    });

    it("should not resolve INVALID payment accounts", async () => {
      // No active account found (INVALID is filtered out)
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: null,
      });

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();
    });

    it("should not resolve DISABLED payment accounts", async () => {
      // No active account found (DISABLED is filtered out)
      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.club.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: null,
      });

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();
    });

    it("should only resolve ACTIVE payment accounts", async () => {
      const mockActiveAccount = {
        id: mockAccountId,
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        clubId: mockClubId,
        organizationId: null,
        merchantId: encrypt(mockMerchantId),
        secretKey: encrypt(mockSecretKey),
        providerConfig: null,
        status: PaymentAccountStatus.ACTIVE,
        isActive: true,
        displayName: "Active Account",
        lastVerifiedAt: new Date(),
        verificationError: null,
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdatedBy: "user-1",
      };

      (prisma.paymentAccount.findFirst as jest.Mock).mockResolvedValueOnce(mockActiveAccount);

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).not.toBeNull();
      expect(result?.merchantId).toBe(mockMerchantId);
      expect(result?.secretKey).toBe(mockSecretKey);
    });
  });
});
