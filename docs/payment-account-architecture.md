# Payment Account Architecture

## Overview

The Payment Account architecture provides a flexible, secure, and scalable solution for payment processing in a multi-organization, multi-club SaaS platform. The platform itself **never receives money** - all payments go directly to the organization's or club's payment provider account.

**Implementation Date**: December 2024

## Business Context

- Platform has **Root Admin** (platform owner) — no access to payment keys
- Organizations can have multiple clubs
- Organizations may operate:
  - under **one legal entity** (single payment account shared across clubs)
  - or **multiple legal entities** (separate payment accounts per club)
- The architecture supports **both models**

## Core Concept: Payment Account

A **Payment Account** represents a real merchant account in a payment provider (WayForPay / LiqPay).

It is:
- NOT a user
- NOT a role
- NOT a club or organization
- A standalone financial configuration entity

## Architecture Components

### 1. Database Schema

#### PaymentAccount Model

```prisma
model PaymentAccount {
  id             String                @id @default(uuid())
  provider       PaymentProvider       // WAYFORPAY, LIQPAY
  scope          PaymentAccountScope   // ORGANIZATION or CLUB
  
  // Scope identifiers (mutually exclusive based on scope)
  organizationId String?               // Set when scope = ORGANIZATION
  clubId         String?               // Set when scope = CLUB
  
  // Encrypted credentials
  merchantId     String                // Encrypted merchant ID
  secretKey      String                // Encrypted secret key
  providerConfig String?               // Encrypted JSON config
  
  // Status and metadata
  isActive       Boolean               @default(true)
  displayName    String?
  
  // Audit fields
  createdById    String
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  lastUpdatedBy  String?
  
  // Relations
  organization   Organization?
  club           Club?
}
```

#### Enums

```prisma
enum PaymentProvider {
  WAYFORPAY
  LIQPAY
}

enum PaymentAccountScope {
  ORGANIZATION  // Shared across all clubs in organization
  CLUB          // Specific to one club
}
```

#### Rules

- `scope = ORGANIZATION` → `organizationId` is set, `clubId` is NULL
- `scope = CLUB` → `clubId` is set, `organizationId` is also known via club
- Only one active PaymentAccount per provider per scope
- All secrets are encrypted at rest using AES-256-GCM

### 2. Payment Resolution Logic (Critical)

When creating a payment for a booking:

1. Determine the club related to the booking
2. Check if the club has an **active CLUB-level PaymentAccount**
3. If not found → fallback to **ORGANIZATION-level PaymentAccount**
4. If none exists → payment is not allowed

**Implementation**: `resolvePaymentAccountForBooking()` in `src/services/paymentAccountService.ts`

```typescript
const paymentAccount = await resolvePaymentAccountForBooking(clubId);
if (!paymentAccount) {
  throw new Error("Payment processing not configured for this club");
}
// Use paymentAccount.merchantId and paymentAccount.secretKey
```

### 3. Security

#### Encryption

All sensitive fields are encrypted at rest using AES-256-GCM:
- `merchantId`
- `secretKey`
- `providerConfig` (if contains secrets)

**Implementation**: `src/lib/encryption.ts`

```typescript
import { encrypt, decrypt } from "@/lib/encryption";

// Encrypt before storing
const encrypted = encrypt(plaintext);

// Decrypt when needed
const plaintext = decrypt(encrypted);
```

**Encryption Key**: Set via `ENCRYPTION_KEY` environment variable. Must be a strong, randomly generated key in production.

#### Access Control

| Feature | Root Admin | Org Admin | Club Owner | Club Admin | Member |
|---------|-----------|-----------|------------|------------|--------|
| View Payment Keys | ❌ | ❌ | ✅ | ❌ | ❌ |
| Edit Payment Keys | ❌ | ❌ | ✅ | ❌ | ❌ |
| View Payment Status | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |

**Key Security Principles**:
- Root Admin has **no access** to payment keys (platform should never see credentials)
- Organization Admin has **no access** to payment keys
- Club Admin has **no access** to payment keys
- Only **Organization Owners** can manage org-level payment accounts
- Only **Club Owners** can manage club-level payment accounts
- Secrets are **never exposed** to frontend
- All updates are **audited**

#### Audit Logging

All payment account operations are logged:

```typescript
await logAudit({
  actorId: userId,
  action: "payment_account.create",
  targetType: "organization",
  targetId: organizationId,
  detail: JSON.stringify({ paymentAccountId, provider }),
});
```

Actions tracked:
- `payment_account.create`
- `payment_account.update`
- `payment_account.delete`

### 4. API Endpoints

#### Organization-Level Payment Accounts

**List**: `GET /api/admin/organizations/[id]/payment-accounts`
- Returns: Masked payment accounts (no sensitive data)
- Access: Organization Owner, Root Admin (masked data only)

**Create**: `POST /api/admin/organizations/[id]/payment-accounts`
- Body: `{ provider, merchantId, secretKey, providerConfig?, displayName? }`
- Access: Organization Owner only (Root Admin blocked)

**Get**: `GET /api/admin/organizations/[id]/payment-accounts/[accountId]`
- Returns: Masked payment account
- Access: Organization Owner, Root Admin (masked data only)

**Update**: `PUT /api/admin/organizations/[id]/payment-accounts/[accountId]`
- Body: Partial credentials to update
- Access: Organization Owner only (Root Admin blocked)

**Delete**: `DELETE /api/admin/organizations/[id]/payment-accounts/[accountId]`
- Access: Organization Owner only (Root Admin blocked)

#### Club-Level Payment Accounts

**List**: `GET /api/admin/clubs/[id]/payment-accounts`
- Returns: Masked payment accounts
- Access: Club Owner, Root Admin (masked data only)

**Create**: `POST /api/admin/clubs/[id]/payment-accounts`
- Body: `{ provider, merchantId, secretKey, providerConfig?, displayName? }`
- Access: Club Owner only (Root Admin blocked)

**Get**: `GET /api/admin/clubs/[id]/payment-accounts/[accountId]`
- Returns: Masked payment account
- Access: Club Owner, Root Admin (masked data only)

**Update**: `PUT /api/admin/clubs/[id]/payment-accounts/[accountId]`
- Body: Partial credentials to update
- Access: Club Owner only (Root Admin blocked)

**Delete**: `DELETE /api/admin/clubs/[id]/payment-accounts/[accountId]`
- Access: Club Owner only (Root Admin blocked)

**Status**: `GET /api/admin/clubs/[id]/payment-accounts/status`
- Returns: `{ isConfigured, provider, scope, displayName }`
- Access: Any authenticated user

### 5. TypeScript Types

```typescript
// Payment provider enum
enum PaymentProvider {
  WAYFORPAY = "WAYFORPAY",
  LIQPAY = "LIQPAY",
}

// Payment account scope
enum PaymentAccountScope {
  ORGANIZATION = "ORGANIZATION",
  CLUB = "CLUB",
}

// Masked for frontend (no secrets)
interface MaskedPaymentAccount {
  id: string;
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  organizationId: string | null;
  clubId: string | null;
  isActive: boolean;
  displayName: string | null;
  isConfigured: boolean;
  lastUpdated: Date;
}

// Resolved with decrypted credentials (backend only)
interface ResolvedPaymentAccount {
  id: string;
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  merchantId: string;      // Decrypted
  secretKey: string;       // Decrypted
  providerConfig: Record<string, unknown> | null;
  displayName: string | null;
}

// Create/update payload
interface PaymentAccountCredentials {
  provider: PaymentProvider;
  scope: PaymentAccountScope;
  organizationId?: string;
  clubId?: string;
  merchantId: string;      // Plain text (will be encrypted)
  secretKey: string;       // Plain text (will be encrypted)
  providerConfig?: Record<string, unknown>;
  displayName?: string;
  isActive?: boolean;
}
```

## Usage Examples

### Create Organization-Level Payment Account

```typescript
// POST /api/admin/organizations/[orgId]/payment-accounts
{
  "provider": "WAYFORPAY",
  "merchantId": "merchant-id-123",
  "secretKey": "secret-key-456",
  "displayName": "Primary WayForPay Account",
  "isActive": true
}
```

### Create Club-Level Payment Account

```typescript
// POST /api/admin/clubs/[clubId]/payment-accounts
{
  "provider": "LIQPAY",
  "merchantId": "club-merchant-789",
  "secretKey": "club-secret-abc",
  "displayName": "Club LiqPay Account",
  "isActive": true
}
```

### Check Payment Status for Booking Flow

```typescript
// GET /api/admin/clubs/[clubId]/payment-accounts/status
// Response:
{
  "clubId": "club-123",
  "status": {
    "isConfigured": true,
    "provider": "WAYFORPAY",
    "scope": "ORGANIZATION",
    "displayName": "Primary WayForPay Account"
  }
}
```

### Resolve Payment Account in Backend

```typescript
import { resolvePaymentAccountForBooking } from "@/services/paymentAccountService";

// During booking payment processing
const paymentAccount = await resolvePaymentAccountForBooking(clubId);

if (!paymentAccount) {
  throw new Error("Payment processing not configured");
}

// Use decrypted credentials to process payment
const paymentResult = await processPayment({
  provider: paymentAccount.provider,
  merchantId: paymentAccount.merchantId,
  secretKey: paymentAccount.secretKey,
  amount: bookingPrice,
  // ... other payment details
});
```

## Migration from Old System

### Old System (Deprecated)

Payment keys were stored directly on Club model:
- `Club.wayforpayKey`
- `Club.liqpayKey`

This approach:
- ❌ Didn't support organization-level payments
- ❌ Mixed business entities with payment configuration
- ❌ Limited to 2 providers only
- ❌ No proper encryption or audit trail

### Migration Path

1. **Keep old fields temporarily** for backward compatibility
2. **Create migration script** to convert existing keys:
   ```typescript
   // For each club with wayforpayKey or liqpayKey:
   // 1. Create new PaymentAccount with scope=CLUB
   // 2. Encrypt and store the keys
   // 3. Mark as migrated
   ```
3. **Update booking flow** to use new resolution logic
4. **Deprecate old endpoints** that access `Club.wayforpayKey` / `Club.liqpayKey`
5. **Remove old fields** after full migration (future phase)

## Future Enhancements

1. **Additional Payment Providers**
   - Stripe (for international payments)
   - Other EU payment service providers
   - Easy to add via enum extension

2. **Multi-Provider Support**
   - Allow multiple active accounts per scope
   - Provider selection logic (default, preferred, currency-based)

3. **Payment Analytics**
   - Track which payment accounts are used most
   - Monitor transaction success rates per provider
   - Financial reporting by account

4. **Automated Testing**
   - Payment provider sandbox integration
   - Test mode for payment accounts
   - Validation of credentials before activation

5. **UI Components**
   - Payment account management dashboard
   - Visual indicator of payment configuration status
   - Setup wizards for new accounts

## Files

### Backend
- `/prisma/schema.prisma` - Database schema
- `/prisma/migrations/20251216072231_add_payment_account_model/migration.sql` - Migration
- `/src/types/paymentAccount.ts` - TypeScript types
- `/src/lib/encryption.ts` - Encryption utilities
- `/src/services/paymentAccountService.ts` - Core business logic
- `/src/app/api/admin/organizations/[id]/payment-accounts/` - Org API endpoints
- `/src/app/api/admin/clubs/[id]/payment-accounts/` - Club API endpoints

### Tests
- `/src/__tests__/encryption.test.ts` - Encryption tests
- `/src/__tests__/payment-account-resolution.test.ts` - Resolution logic tests

### Documentation
- `/docs/payment-account-architecture.md` - This document

## Testing

Run tests:
```bash
npm test encryption.test.ts
npm test payment-account-resolution.test.ts
```

## Environment Variables

Required for production:

```bash
# Strong encryption key (32+ characters, random)
ENCRYPTION_KEY=your-strong-random-encryption-key-here

# Database
DATABASE_URL=postgresql://...
```

## Acceptance Criteria

✅ PaymentAccount entity exists and is used for all payments
✅ No payment keys are stored directly on Organization or Club entities (old ones remain for migration)
✅ Booking payment always resolves PaymentAccount via defined priority
✅ Platform never receives funds (credentials go to merchant accounts)
✅ Architecture supports adding new payment providers without refactor
✅ All secrets encrypted at rest
✅ Root Admin has no access to payment keys
✅ Organization/Club Owners can manage their payment accounts
✅ Audit logging for all payment account operations
✅ Masked APIs for frontend (no sensitive data exposed)

## Support

For questions or issues with payment account architecture:
1. Review this documentation
2. Check `/src/services/paymentAccountService.ts` for implementation details
3. Refer to API endpoint comments for usage examples
4. Review security requirements in `.github/copilot-settings.md`
