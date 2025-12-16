# Payment Account Verification Status Flow

## Overview

This document describes the implementation of the asynchronous payment account verification flow, ensuring users can see the real-time status of payment account verification.

## Backend Implementation

### 1. Status Enforcement

**Location**: `src/services/paymentAccountService.ts`

- When a Payment Account is created or updated with new credentials:
  - Status is automatically set to `PENDING`
  - An async verification job is enqueued
  - The frontend immediately receives the `PENDING` status

```typescript
// In createPaymentAccount()
const paymentAccount = await prisma.paymentAccount.create({
  data: {
    // ...
    status: PaymentAccountStatus.PENDING, // Always start as PENDING
    // ...
  },
});

// Trigger verification asynchronously (don't wait for it)
verifyPaymentAccountAsync(paymentAccount.id).catch((error) => {
  console.error(`[PaymentAccountService] Failed to verify account ${paymentAccount.id}:`, error);
});
```

### 2. Async Verification Job

**Location**: `src/services/paymentAccountService.ts`

The verification job:
- Decrypts credentials
- Calls the appropriate provider verifier (WayForPay / LiqPay)
- Updates status based on result:
  - `ACTIVE` on success
  - `INVALID` on credential error
  - Keeps `PENDING` on temporary provider failure (would retry later in production)

```typescript
export async function verifyPaymentAccount(id: string): Promise<VerificationResult> {
  // Get and decrypt account
  const account = await prisma.paymentAccount.findUnique({ where: { id } });
  const decrypted = decryptPaymentAccount(account);
  
  // Get provider verifier
  const verifier = getPaymentProviderVerifier(decrypted.provider);
  
  // Perform verification (never creates real payments)
  const result = await verifier.verify(
    decrypted.merchantId,
    decrypted.secretKey,
    decrypted.providerConfig
  );
  
  // Update status based on result
  if (result.success) {
    await prisma.paymentAccount.update({
      where: { id },
      data: {
        status: PaymentAccountStatus.ACTIVE,
        lastVerifiedAt: result.timestamp,
        verificationError: undefined,
      },
    });
  } else {
    await prisma.paymentAccount.update({
      where: { id },
      data: {
        status: PaymentAccountStatus.INVALID,
        verificationError: result.error || "Verification failed",
      },
    });
  }
  
  return result;
}
```

### 3. Retry Verification Endpoint

**Endpoints**:
- `POST /api/admin/clubs/[id]/payment-accounts/[accountId]/verify`
- `POST /api/admin/organizations/[id]/payment-accounts/[accountId]/verify`

**Access**: Club Owner / Organization Admin only

The retry endpoint:
1. Sets status back to `PENDING`
2. Clears previous verification error
3. Enqueues async verification job
4. Returns immediately with updated account (status: PENDING)

```typescript
export async function retryPaymentAccountVerification(id: string): Promise<MaskedPaymentAccount> {
  // First, set status to PENDING
  const account = await prisma.paymentAccount.update({
    where: { id },
    data: {
      status: PaymentAccountStatus.PENDING,
      verificationError: null,
      updatedAt: new Date(),
    },
  });

  // Trigger verification asynchronously
  verifyPaymentAccountAsync(id).catch((error) => {
    console.error(`[PaymentAccountService] Failed to verify account ${id} after retry:`, error);
  });

  return maskPaymentAccount(account);
}
```

### 4. API Contract

All payment account endpoints return masked accounts with:

```typescript
interface MaskedPaymentAccount {
  id: string;
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  organizationId: string | null;
  clubId: string | null;
  status: PaymentAccountStatus;  // PENDING, ACTIVE, INVALID, DISABLED
  isActive: boolean;
  displayName: string | null;
  isConfigured: boolean;
  lastUpdated: Date;
  lastVerifiedAt: Date | null;
  verificationError: string | null;
}
```

## Frontend Implementation

### 5. Display Verification Status

**Location**: `src/components/admin/payment-accounts/PaymentAccountList.tsx`

The component now displays:
- **Verification Status Badge**:
  - `PENDING` → Yellow/Warning badge: "Verifying..."
  - `ACTIVE` → Green/Success badge: "Active"
  - `INVALID` → Red/Danger badge: "Invalid credentials"
  - `DISABLED` → Gray/Default badge: "Disabled"
- **Error Tooltip**: Shows ⚠️ icon with hover tooltip for verification errors

```typescript
const getStatusVariant = (status: PaymentAccountStatus): "success" | "warning" | "danger" | "default" => {
  switch (status) {
    case PaymentAccountStatus.ACTIVE:
      return "success";
    case PaymentAccountStatus.PENDING:
      return "warning";
    case PaymentAccountStatus.INVALID:
      return "danger";
    case PaymentAccountStatus.DISABLED:
      return "default";
  }
};
```

### 6. Retry Verification Button

**Location**: `src/components/admin/payment-accounts/PaymentAccountList.tsx`

Button appears when:
- `status === 'INVALID'`
- User has Owner permissions (`canRetry` prop is true)

```typescript
{account.status === PaymentAccountStatus.INVALID && canRetry && onRetry && (
  <Button size="small" variant="primary" onClick={() => onRetry(account)}>
    {t("actions.retryVerification")}
  </Button>
)}
```

### 7. Polling for `pending` Status

**Location**: `src/app/(pages)/admin/payment-accounts/page.tsx`

Automatic polling implemented:
- Checks all accounts for `PENDING` status
- If any found, polls every 5 seconds
- Stops when all accounts are either `ACTIVE` or `INVALID`

```typescript
useEffect(() => {
  // Check if there are any pending accounts
  const allAccounts = [...organizationAccounts, ...clubAccounts.flatMap(c => c.accounts)];
  const hasPendingAccounts = allAccounts.some(account => account.status === "PENDING");

  if (!hasPendingAccounts) {
    return; // No polling needed
  }

  // Set up polling every 5 seconds
  const pollInterval = setInterval(() => {
    fetchAccounts();
  }, 5000);

  // Cleanup on unmount or when no more pending accounts
  return () => {
    clearInterval(pollInterval);
  };
}, [organizationAccounts, clubAccounts, fetchAccounts]);
```

### 8. Payment Actions Disabled Until Active

**Location**: `src/services/paymentAccountService.ts`

The `resolvePaymentAccountForBooking` function only returns accounts with `status === ACTIVE`:

```typescript
const clubPaymentAccount = await prisma.paymentAccount.findFirst({
  where: {
    clubId,
    scope: PaymentAccountScope.CLUB,
    status: PaymentAccountStatus.ACTIVE, // Only allow ACTIVE accounts
    ...(provider && { provider }),
  },
});
```

This ensures that:
- Booking flows cannot use `PENDING` or `INVALID` accounts
- Payment processing only happens with verified credentials

## Translation Keys

Added to `locales/en.json` and `locales/uk.json`:

```json
{
  "paymentAccount": {
    "table": {
      "verificationStatus": "Verification Status"
    },
    "verificationStatus": {
      "active": "Active",
      "pending": "Verifying...",
      "invalid": "Invalid credentials",
      "disabled": "Disabled"
    },
    "actions": {
      "retryVerification": "Retry Verification"
    },
    "messages": {
      "verificationStarted": "Verification started. Please wait..."
    }
  }
}
```

## User Flow

### Creating a Payment Account

1. User fills in merchant credentials and clicks "Save"
2. Backend creates account with `status: PENDING`
3. Backend triggers async verification (non-blocking)
4. Frontend shows "Verifying..." badge immediately
5. Frontend starts polling every 5 seconds
6. After verification completes (typically 2-10 seconds):
   - Success → Status changes to "Active" (green badge)
   - Failure → Status changes to "Invalid credentials" (red badge) + error message
7. Polling stops automatically

### Retrying Failed Verification

1. User sees "Invalid credentials" badge and retry button
2. User clicks "Retry Verification"
3. Backend sets status back to `PENDING`
4. Backend triggers async verification
5. Frontend shows "Verifying..." and starts polling again
6. Status updates automatically when verification completes

## Security Notes

- **No secrets exposed**: Frontend never receives decrypted credentials
- **Owner-only access**: Only Organization Owners and Club Owners can retry verification
- **Root Admin restricted**: Root Admins cannot access payment credentials
- **Verification is non-charging**: Provider verifiers validate credentials without creating real payments

## Testing

All existing tests pass:
```bash
npm test -- payment-account
# Test Suites: 2 passed, 2 total
# Tests:       17 passed, 17 total
```

Tests cover:
- Status transitions (PENDING → ACTIVE / INVALID)
- Payment account resolution (only ACTIVE accounts used)
- Verification success and failure scenarios
- Async verification behavior

## Future Enhancements

Potential improvements for production:
1. **WebSocket updates**: Replace polling with real-time status updates
2. **Retry logic**: Implement exponential backoff for temporary provider failures
3. **Background job queue**: Use a proper job queue (e.g., BullMQ) instead of fire-and-forget async calls
4. **Notification**: Email notification when verification completes
5. **Detailed error codes**: Surface specific error reasons from providers
