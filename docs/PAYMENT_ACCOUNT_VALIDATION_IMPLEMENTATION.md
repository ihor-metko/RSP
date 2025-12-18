# Payment Account Technical Validation Implementation

**Implementation Date**: December 16, 2024  
**Status**: ✅ Complete

## Overview

This implementation adds technical validation status for Payment Accounts to verify whether merchant credentials are valid and usable with the payment provider (WayForPay, LiqPay). This ensures that payments can only be processed when credentials have been verified.

## Requirements Implemented

### 1. Payment Account Status ✅

Extended `PaymentAccount.status` to support four values:

- **PENDING** — Credentials saved but not yet verified
- **ACTIVE** — Credentials verified successfully, payments allowed
- **INVALID** — Credentials failed verification (wrong keys, blocked account, etc.)
- **DISABLED** — Manually disabled by owner

**Only ACTIVE accounts** are used for payment processing.

### 2. Verification Flow ✅

#### Automatic Verification
- Creating or updating Payment Account credentials automatically sets status to `PENDING`
- Backend triggers asynchronous verification process immediately
- No blocking on the create/update response

#### Provider-Specific Verification
- **WayForPay**: Uses CHECK_STATUS API with HMAC-MD5 signature
- **LiqPay**: Uses payment/status API with SHA1 signature
- Both perform safe, non-charging validation (no real payments)

#### Status Updates Based on Result
- **Success** → Set status to `ACTIVE`, record `lastVerifiedAt`
- **Failure** → Set status to `INVALID`, record `verificationError`

#### Error Handling
- Provider errors are caught and logged
- Verification errors are stored in `verificationError` field
- Verification attempts are logged via audit system

### 3. API Changes ✅

#### Create/Update Endpoints
- `POST /api/admin/clubs/[id]/payment-accounts`
- `POST /api/admin/organizations/[id]/payment-accounts`
- `PUT /api/admin/clubs/[id]/payment-accounts/[accountId]`
- `PUT /api/admin/organizations/[id]/payment-accounts/[accountId]`

All endpoints:
- Always reset status to `PENDING` when credentials change
- Trigger asynchronous verification
- Return immediately without blocking

#### Manual Verification Endpoints (New)
- `POST /api/admin/clubs/[id]/payment-accounts/[accountId]/verify`
- `POST /api/admin/organizations/[id]/payment-accounts/[accountId]/verify`

Features:
- Club/Organization owners can manually re-run verification
- Root admins are blocked (no access to credentials)
- Verification result returned synchronously
- Audit logging for all verification attempts

### 4. Usage in Payments ✅

#### Payment Account Resolution
- `resolvePaymentAccountForBooking()` only returns accounts with status = `ACTIVE`
- Accounts with status `PENDING`, `INVALID`, or `DISABLED` are filtered out
- Fallback logic preserved (club-level → organization-level)

#### Payment Availability Check
- `getPaymentAccountStatus()` returns `PaymentAccountAvailability`
- Includes `isAvailable` flag (true only when status = `ACTIVE`)
- Frontend can check payment availability before attempting payment

### 5. Security ✅

- ✅ Secret keys remain encrypted at rest (AES-256-GCM)
- ✅ No secret keys returned to frontend (masked accounts only)
- ✅ Verification logic runs server-side only
- ✅ Root admins have no access to payment keys or verification
- ✅ All verification attempts logged via audit system

## Files Changed

### Database Schema
- `prisma/schema.prisma` - Added PaymentAccountStatus enum and new fields
- `prisma/migrations/20251216172722_add_payment_account_status/migration.sql` - Migration

### Type Definitions
- `src/types/paymentAccount.ts` - Updated types for status and verification

### Verification Services (New)
- `src/services/paymentProviders/types.ts` - Base interfaces
- `src/services/paymentProviders/wayforpayVerifier.ts` - WayForPay verification
- `src/services/paymentProviders/liqpayVerifier.ts` - LiqPay verification
- `src/services/paymentProviders/index.ts` - Factory function

### Core Services
- `src/services/paymentAccountService.ts` - Verification logic and status handling

### API Endpoints (New)
- `src/app/api/admin/clubs/[id]/payment-accounts/[accountId]/verify/route.ts`
- `src/app/api/admin/organizations/[id]/payment-accounts/[accountId]/verify/route.ts`

### Tests
- `src/__tests__/payment-account-resolution.test.ts` - Updated for status field
- `src/__tests__/payment-account-verification.test.ts` - New verification tests

## Verification Logic Details

### WayForPay Verification

**Secure Test Payment Approach** (Updated Implementation)

WayForPay's `CHECK_STATUS` and `TRANSACTION_LIST` APIs are NOT reliable for credential verification as they may return success even with invalid credentials. Therefore, verification uses a **secure test payment request**:

```typescript
// Uses PURCHASE API with minimal test payment
// Request Parameters:
// - transactionType: "PURCHASE"
// - amount: "1" (1 UAH - minimal amount)
// - Test customer data (no real user interaction)
// - Test order reference: verify_{timestamp}

// Signature: HMAC-MD5(merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName;productCount;productPrice)

// Response Codes:
// Success: Any response with reasonCode or invoiceUrl (credentials accepted)
// - reasonCode 1109 = Format error (but signature valid - credentials OK)
// Invalid: reasonCode 1113 (invalid signature - invalid credentials)
// Blocked: reasonCode 1101 (merchant not found/inactive)
```

**Security Notes:**
- No real payment is processed (test mode)
- No real customer data is used
- No user interaction required
- Validates signature generation using actual payment flow
- More reliable than CHECK_STATUS API

### LiqPay Verification

```typescript
// Uses payment/status API
// Signature: SHA1(privateKey + data + privateKey)
// Success: err_code "order_not_found" (expected)
// Invalid: err_code "err_signature" (invalid credentials)
// Blocked: err_code "err_public_key" (invalid public key)
```

### Verification Timeout
- Both verifiers use 10-second timeout
- Network errors are caught and logged
- Timeout errors result in status remaining `PENDING`

## Testing

All tests pass successfully:
- ✅ Payment account resolution with status filtering
- ✅ Successful verification (PENDING → ACTIVE)
- ✅ Failed verification (PENDING → INVALID)
- ✅ Only ACTIVE accounts used for payments
- ✅ Payment availability checks

Run tests:
```bash
npm test -- payment-account
```

## Usage Examples

### Check Payment Availability

```typescript
const availability = await getPaymentAccountStatus(clubId);

if (!availability.isAvailable) {
  if (availability.status === PaymentAccountStatus.PENDING) {
    return { message: "Payment verification in progress" };
  } else if (availability.status === PaymentAccountStatus.INVALID) {
    return { message: "Payment credentials invalid", error: verificationError };
  } else {
    return { message: "Payment not configured" };
  }
}
```

### Manual Verification Trigger

```bash
# Club-level account
curl -X POST /api/admin/clubs/{clubId}/payment-accounts/{accountId}/verify

# Organization-level account
curl -X POST /api/admin/organizations/{orgId}/payment-accounts/{accountId}/verify
```

### Payment Resolution

```typescript
// Only ACTIVE accounts are returned
const account = await resolvePaymentAccountForBooking(clubId);

if (!account) {
  throw new Error("Payment not available - account not verified");
}

// Use account.merchantId and account.secretKey to process payment
```

## Monitoring

### Logs to Check
- `[PaymentAccountService] Account ${id} verified successfully`
- `[PaymentAccountService] Account ${id} verification failed: ${error}`
- `[WayForPayVerifier] Verification error: ${error}`
- `[LiqPayVerifier] Verification error: ${error}`

### Audit Log Events
- `payment_account.verify` - Manual verification triggered
- `payment_account.create` - Account created (verification auto-triggered)
- `payment_account.update` - Account updated (verification auto-triggered if credentials changed)

## Future Enhancements

1. **Retry Mechanism**
   - Implement automatic retry for failed verifications
   - Exponential backoff for network errors
   - Maximum retry attempts

2. **Verification Queue**
   - Use job queue (Bull, BullMQ) for verification tasks
   - Better handling of concurrent verifications
   - Persistent retry state

3. **Scheduled Re-Verification**
   - Periodic verification of ACTIVE accounts
   - Detect when credentials expire or are revoked
   - Alert owners before expiration

4. **Webhook Support**
   - Notify owners when verification completes
   - Send alerts for INVALID status
   - Integration with notification system

## Migration Notes

### Existing Accounts
The migration automatically updates existing accounts:
- Active accounts (`isActive = true`) → Status set to `ACTIVE`
- Disabled accounts (`isActive = false`) → Status set to `DISABLED`

### Backward Compatibility
- `isActive` field is preserved but deprecated in favor of `status`
- Existing code checking `isActive` will continue to work
- Recommended to migrate to status-based checks

## Acceptance Criteria

✅ Payment Accounts automatically move from pending → active or invalid  
✅ Payments cannot be initiated using pending, invalid, or disabled accounts  
✅ Backend exposes current Payment Account status to frontend  
✅ Logs clearly show verification attempts and failures  
✅ Secret keys remain encrypted at rest  
✅ No secret keys returned to frontend  
✅ Verification logic runs server-side only  
✅ Root admins have no access to verification (security requirement)

## Support

For issues or questions:
1. Check logs for verification errors
2. Review audit logs for verification attempts
3. Check payment account status via API
4. Manually trigger verification via API endpoint
5. Consult payment provider documentation for error codes
