/**
 * Payment Account Service
 * 
 * Core business logic for payment account management and resolution.
 * Implements the payment account resolution strategy:
 * 1. Check for active club-level payment account
 * 2. Fallback to organization-level payment account
 * 3. Return null if no payment account is configured
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, encryptJSON, decryptJSON } from "@/lib/encryption";
import {
  PaymentProvider,
  PaymentAccountScope,
  PaymentAccount,
  MaskedPaymentAccount,
  PaymentAccountCredentials,
  PaymentAccountStatus,
  ResolvedPaymentAccount,
} from "@/types/paymentAccount";

/**
 * Resolve payment account for a booking
 * 
 * This is the critical payment resolution logic:
 * 1. Determine the club related to the booking
 * 2. Check if the club has an active CLUB-level PaymentAccount
 * 3. If not found → fallback to ORGANIZATION-level PaymentAccount
 * 4. If none exists → return null (payment not allowed)
 * 
 * @param clubId - The club ID for the booking
 * @param provider - Optional: specific provider to use (if multiple are configured)
 * @returns Resolved payment account with decrypted credentials, or null if not configured
 */
export async function resolvePaymentAccountForBooking(
  clubId: string,
  provider?: PaymentProvider
): Promise<ResolvedPaymentAccount | null> {
  // Step 1: Try to find active club-level payment account
  const clubPaymentAccount = await prisma.paymentAccount.findFirst({
    where: {
      clubId,
      scope: PaymentAccountScope.CLUB,
      isActive: true,
      ...(provider && { provider }),
    },
    orderBy: {
      updatedAt: "desc", // Use most recently updated if multiple
    },
  });

  if (clubPaymentAccount) {
    return decryptPaymentAccount(clubPaymentAccount);
  }

  // Step 2: Fallback to organization-level payment account
  // First, get the club to find its organization
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { organizationId: true },
  });

  if (!club?.organizationId) {
    return null;
  }

  const orgPaymentAccount = await prisma.paymentAccount.findFirst({
    where: {
      organizationId: club.organizationId,
      scope: PaymentAccountScope.ORGANIZATION,
      isActive: true,
      ...(provider && { provider }),
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (orgPaymentAccount) {
    return decryptPaymentAccount(orgPaymentAccount);
  }

  // Step 3: No payment account configured
  return null;
}

/**
 * Get payment account status for a club (masked, no sensitive data)
 * Returns whether payment processing is configured and available
 * 
 * @param clubId - The club ID to check
 * @returns Payment account status
 */
export async function getPaymentAccountStatus(clubId: string): Promise<PaymentAccountStatus> {
  // Check club-level first
  const clubAccount = await prisma.paymentAccount.findFirst({
    where: {
      clubId,
      scope: PaymentAccountScope.CLUB,
      isActive: true,
    },
    select: {
      provider: true,
      scope: true,
      displayName: true,
    },
  });

  if (clubAccount) {
    return {
      isConfigured: true,
      provider: clubAccount.provider as PaymentProvider,
      scope: clubAccount.scope as PaymentAccountScope,
      displayName: clubAccount.displayName,
    };
  }

  // Fallback to organization-level
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { organizationId: true },
  });

  if (club?.organizationId) {
    const orgAccount = await prisma.paymentAccount.findFirst({
      where: {
        organizationId: club.organizationId,
        scope: PaymentAccountScope.ORGANIZATION,
        isActive: true,
      },
      select: {
        provider: true,
        scope: true,
        displayName: true,
      },
    });

    if (orgAccount) {
      return {
        isConfigured: true,
        provider: orgAccount.provider as PaymentProvider,
        scope: orgAccount.scope as PaymentAccountScope,
        displayName: orgAccount.displayName,
      };
    }
  }

  return {
    isConfigured: false,
    provider: null,
    scope: null,
    displayName: null,
  };
}

/**
 * Create a new payment account with encrypted credentials
 * 
 * @param credentials - Payment account credentials (plain text)
 * @param createdById - User ID creating the payment account
 * @returns Created payment account (masked)
 */
export async function createPaymentAccount(
  credentials: PaymentAccountCredentials,
  createdById: string
): Promise<MaskedPaymentAccount> {
  // Validate scope identifiers
  if (credentials.scope === PaymentAccountScope.ORGANIZATION && !credentials.organizationId) {
    throw new Error("organizationId is required for ORGANIZATION scope");
  }
  if (credentials.scope === PaymentAccountScope.CLUB && !credentials.clubId) {
    throw new Error("clubId is required for CLUB scope");
  }

  // Validate credentials before encryption
  if (!credentials.merchantId || typeof credentials.merchantId !== "string" || credentials.merchantId.trim() === "") {
    throw new Error("merchantId must be a non-empty string");
  }
  if (!credentials.secretKey || typeof credentials.secretKey !== "string" || credentials.secretKey.trim() === "") {
    throw new Error("secretKey must be a non-empty string");
  }

  // Encrypt credentials
  const encryptedMerchantId = encrypt(credentials.merchantId);
  const encryptedSecretKey = encrypt(credentials.secretKey);
  
  // Only encrypt providerConfig if it's a valid object
  const encryptedProviderConfig = 
    credentials.providerConfig && 
    typeof credentials.providerConfig === "object" && 
    !Array.isArray(credentials.providerConfig)
      ? encryptJSON(credentials.providerConfig)
      : null;

  // Check if an account with this scope already exists
  const existingAccount = await prisma.paymentAccount.findFirst({
    where: {
      provider: credentials.provider,
      scope: credentials.scope,
      organizationId: credentials.organizationId || null,
      clubId: credentials.clubId || null,
    },
  });

  if (existingAccount) {
    const entityId = credentials.organizationId || credentials.clubId || "unknown";
    const entityType = credentials.scope === PaymentAccountScope.ORGANIZATION ? "organization" : "club";
    throw new Error(
      `A payment account for ${credentials.provider} at ${credentials.scope} level already exists for ${entityType} ${entityId}`
    );
  }

  // Create the payment account
  const paymentAccount = await prisma.paymentAccount.create({
    data: {
      provider: credentials.provider,
      scope: credentials.scope,
      organizationId: credentials.organizationId || null,
      clubId: credentials.clubId || null,
      merchantId: encryptedMerchantId,
      secretKey: encryptedSecretKey,
      providerConfig: encryptedProviderConfig,
      isActive: credentials.isActive !== undefined ? credentials.isActive : true,
      displayName: credentials.displayName || null,
      createdById,
      lastUpdatedBy: createdById,
    },
  });

  return maskPaymentAccount(paymentAccount);
}

/**
 * Update payment account credentials
 * 
 * @param id - Payment account ID
 * @param credentials - New credentials (plain text)
 * @param updatedById - User ID updating the account
 * @returns Updated payment account (masked)
 */
export async function updatePaymentAccount(
  id: string,
  credentials: Partial<PaymentAccountCredentials>,
  updatedById: string
): Promise<MaskedPaymentAccount> {
  const updateData: Record<string, unknown> = {
    lastUpdatedBy: updatedById,
    updatedAt: new Date(),
  };

  // Encrypt new credentials if provided
  if (credentials.merchantId !== undefined) {
    if (typeof credentials.merchantId !== "string" || credentials.merchantId.trim() === "") {
      throw new Error("merchantId must be a non-empty string");
    }
    updateData.merchantId = encrypt(credentials.merchantId);
  }
  if (credentials.secretKey !== undefined) {
    if (typeof credentials.secretKey !== "string" || credentials.secretKey.trim() === "") {
      throw new Error("secretKey must be a non-empty string");
    }
    updateData.secretKey = encrypt(credentials.secretKey);
  }
  if (credentials.providerConfig) {
    // Validate that providerConfig is a valid object before encrypting
    if (typeof credentials.providerConfig !== "object" || Array.isArray(credentials.providerConfig)) {
      throw new Error("providerConfig must be a non-null object");
    }
    updateData.providerConfig = encryptJSON(credentials.providerConfig);
  }
  if (credentials.displayName !== undefined) {
    updateData.displayName = credentials.displayName;
  }
  if (credentials.isActive !== undefined) {
    updateData.isActive = credentials.isActive;
  }

  const paymentAccount = await prisma.paymentAccount.update({
    where: { id },
    data: updateData,
  });

  return maskPaymentAccount(paymentAccount);
}

/**
 * Get masked payment account by ID (no sensitive data)
 * 
 * @param id - Payment account ID
 * @returns Masked payment account
 */
export async function getMaskedPaymentAccount(id: string): Promise<MaskedPaymentAccount | null> {
  const paymentAccount = await prisma.paymentAccount.findUnique({
    where: { id },
  });

  if (!paymentAccount) {
    return null;
  }

  return maskPaymentAccount(paymentAccount);
}

/**
 * List all payment accounts for an organization (masked)
 * 
 * @param organizationId - Organization ID
 * @returns Array of masked payment accounts
 */
export async function listOrganizationPaymentAccounts(
  organizationId: string
): Promise<MaskedPaymentAccount[]> {
  const accounts = await prisma.paymentAccount.findMany({
    where: {
      organizationId,
      scope: PaymentAccountScope.ORGANIZATION,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return accounts.map(maskPaymentAccount);
}

/**
 * List all payment accounts for a club (masked)
 * 
 * @param clubId - Club ID
 * @returns Array of masked payment accounts
 */
export async function listClubPaymentAccounts(clubId: string): Promise<MaskedPaymentAccount[]> {
  const accounts = await prisma.paymentAccount.findMany({
    where: {
      clubId,
      scope: PaymentAccountScope.CLUB,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return accounts.map(maskPaymentAccount);
}

/**
 * Deactivate a payment account
 * 
 * @param id - Payment account ID
 * @param deactivatedById - User ID deactivating the account
 */
export async function deactivatePaymentAccount(
  id: string,
  deactivatedById: string
): Promise<void> {
  await prisma.paymentAccount.update({
    where: { id },
    data: {
      isActive: false,
      lastUpdatedBy: deactivatedById,
    },
  });
}

/**
 * Delete a payment account permanently
 * 
 * @param id - Payment account ID
 */
export async function deletePaymentAccount(id: string): Promise<void> {
  await prisma.paymentAccount.delete({
    where: { id },
  });
}

/**
 * Helper: Decrypt payment account credentials
 * 
 * @param account - Encrypted payment account from database
 * @returns Resolved payment account with decrypted credentials
 */
function decryptPaymentAccount(account: unknown): ResolvedPaymentAccount {
  const acc = account as PaymentAccount;
  return {
    id: acc.id,
    provider: acc.provider as PaymentProvider,
    scope: acc.scope as PaymentAccountScope,
    merchantId: decrypt(acc.merchantId),
    secretKey: decrypt(acc.secretKey),
    providerConfig: acc.providerConfig ? decryptJSON(acc.providerConfig) : null,
    displayName: acc.displayName,
  };
}

/**
 * Helper: Mask payment account (remove sensitive data for frontend)
 * 
 * @param account - Payment account from database
 * @returns Masked payment account safe for frontend
 */
function maskPaymentAccount(account: unknown): MaskedPaymentAccount {
  const acc = account as PaymentAccount;
  return {
    id: acc.id,
    provider: acc.provider as PaymentProvider,
    scope: acc.scope as PaymentAccountScope,
    organizationId: acc.organizationId,
    clubId: acc.clubId,
    isActive: acc.isActive,
    displayName: acc.displayName,
    isConfigured: true,
    lastUpdated: acc.updatedAt,
  };
}
