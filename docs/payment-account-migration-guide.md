# Payment Account Migration Guide

## Overview

This guide explains how to migrate from the old payment key system (stored directly on Club model) to the new PaymentAccount architecture.

## Current State (Before Migration)

Payment keys are stored directly on the Club model:
```prisma
model Club {
  // ...
  wayforpayKey String? // Encrypted WayForPay payment key
  liqpayKey    String? // Encrypted LiqPay payment key
}
```

**Problems**:
- No support for organization-level payments
- Keys tied to club entity (mixing concerns)
- No audit trail for key changes
- Limited to 2 payment providers
- No flexible fallback logic

## Target State (After Migration)

Payment accounts are separate entities:
```prisma
model PaymentAccount {
  id             String
  provider       PaymentProvider
  scope          PaymentAccountScope
  organizationId String?
  clubId         String?
  merchantId     String  // Encrypted
  secretKey      String  // Encrypted
  // ...
}
```

**Benefits**:
- ✅ Support for organization-level and club-level payments
- ✅ Separation of concerns
- ✅ Full audit trail
- ✅ Extensible to any number of providers
- ✅ Flexible resolution logic with fallback

## Migration Strategy

### Phase 1: Preparation (Current)

**Status**: ✅ Complete

1. ✅ Create new PaymentAccount schema
2. ✅ Create migration SQL
3. ✅ Implement PaymentAccount service
4. ✅ Create API endpoints
5. ✅ Keep old `wayforpayKey` and `liqpayKey` fields for backward compatibility

### Phase 2: Data Migration (Manual or Script)

**Status**: ⏳ Ready to execute

#### Option A: Automatic Migration Script

Create a migration script that:

```typescript
// scripts/migratePaymentKeys.ts

import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { PaymentProvider, PaymentAccountScope } from "@/types/paymentAccount";

async function migratePaymentKeys() {
  console.log("Starting payment key migration...");

  // Get all clubs with payment keys
  const clubs = await prisma.club.findMany({
    where: {
      OR: [
        { wayforpayKey: { not: null } },
        { liqpayKey: { not: null } },
      ],
    },
    include: {
      clubMemberships: {
        where: { role: "CLUB_OWNER" },
        take: 1,
      },
    },
  });

  console.log(`Found ${clubs.length} clubs with payment keys`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const club of clubs) {
    try {
      const clubOwner = club.clubMemberships[0];
      
      if (!clubOwner) {
        console.warn(`Club ${club.id} (${club.name}) has no owner, skipping`);
        errorCount++;
        continue;
      }

      // Migrate WayForPay key
      if (club.wayforpayKey) {
        await prisma.paymentAccount.create({
          data: {
            provider: PaymentProvider.WAYFORPAY,
            scope: PaymentAccountScope.CLUB,
            clubId: club.id,
            merchantId: club.wayforpayKey, // Already encrypted in old system
            secretKey: club.wayforpayKey,  // Same key (adjust as needed)
            isActive: true,
            displayName: `${club.name} - WayForPay`,
            createdById: clubOwner.userId,
            lastUpdatedBy: clubOwner.userId,
          },
        });
        console.log(`✅ Migrated WayForPay for club ${club.name}`);
        migratedCount++;
      }

      // Migrate LiqPay key
      if (club.liqpayKey) {
        await prisma.paymentAccount.create({
          data: {
            provider: PaymentProvider.LIQPAY,
            scope: PaymentAccountScope.CLUB,
            clubId: club.id,
            merchantId: club.liqpayKey, // Already encrypted in old system
            secretKey: club.liqpayKey,  // Same key (adjust as needed)
            isActive: true,
            displayName: `${club.name} - LiqPay`,
            createdById: clubOwner.userId,
            lastUpdatedBy: clubOwner.userId,
          },
        });
        console.log(`✅ Migrated LiqPay for club ${club.name}`);
        migratedCount++;
      }
    } catch (error) {
      console.error(`❌ Error migrating club ${club.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  ✅ Migrated: ${migratedCount} accounts`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

migratePaymentKeys()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run with:
```bash
npx ts-node --project tsconfig.scripts.json scripts/migratePaymentKeys.ts
```

#### Option B: Manual Migration via API

For each club with payment keys:

1. **Identify clubs with keys**:
   ```sql
   SELECT id, name, wayforpayKey, liqpayKey 
   FROM "Club" 
   WHERE wayforpayKey IS NOT NULL OR liqpayKey IS NOT NULL;
   ```

2. **Create PaymentAccount via API** (as Club Owner):
   ```bash
   # For WayForPay
   curl -X POST /api/admin/clubs/[clubId]/payment-accounts \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "WAYFORPAY",
       "merchantId": "...",
       "secretKey": "...",
       "displayName": "Club WayForPay Account"
     }'

   # For LiqPay
   curl -X POST /api/admin/clubs/[clubId]/payment-accounts \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "LIQPAY",
       "merchantId": "...",
       "secretKey": "...",
       "displayName": "Club LiqPay Account"
     }'
   ```

3. **Verify migration**:
   ```bash
   curl /api/admin/clubs/[clubId]/payment-accounts/status
   ```

### Phase 3: Update Booking Flow

**Status**: ⏳ To be implemented

Update booking payment processing to use new resolution logic:

**Before**:
```typescript
// Old approach - directly access club keys
const club = await prisma.club.findUnique({
  where: { id: clubId },
  select: { wayforpayKey: true, liqpayKey: true },
});

if (!club.wayforpayKey && !club.liqpayKey) {
  throw new Error("Payment not configured");
}

// Use keys directly
const paymentKey = club.wayforpayKey || club.liqpayKey;
```

**After**:
```typescript
// New approach - use payment account resolution
import { resolvePaymentAccountForBooking } from "@/services/paymentAccountService";

const paymentAccount = await resolvePaymentAccountForBooking(clubId);

if (!paymentAccount) {
  throw new Error("Payment processing not configured for this club");
}

// Use resolved account with decrypted credentials
const paymentResult = await processPayment({
  provider: paymentAccount.provider,
  merchantId: paymentAccount.merchantId,
  secretKey: paymentAccount.secretKey,
  amount: bookingPrice,
});
```

### Phase 4: Deprecate Old Fields

**Status**: ⏳ Future phase

After confirming all bookings use the new system:

1. **Mark old fields as deprecated**:
   ```prisma
   model Club {
     // ...
     /// @deprecated Use PaymentAccount instead
     wayforpayKey String?
     /// @deprecated Use PaymentAccount instead
     liqpayKey    String?
   }
   ```

2. **Update API endpoints** to return warnings:
   ```typescript
   // GET /api/admin/clubs/[id]/payment-keys (old endpoint)
   console.warn("DEPRECATED: Use /payment-accounts endpoint instead");
   ```

3. **Monitor usage** of old endpoints

### Phase 5: Remove Old Fields (Future)

**Status**: ⏳ Future phase (after 6+ months)

1. **Create migration** to drop old columns:
   ```sql
   -- Drop old payment key columns
   ALTER TABLE "Club" DROP COLUMN "wayforpayKey";
   ALTER TABLE "Club" DROP COLUMN "liqpayKey";
   ```

2. **Remove old API endpoints**:
   - `/api/admin/clubs/[id]/payment-keys`

3. **Update documentation**

## Rollback Plan

If issues are discovered after migration:

### Quick Rollback (Keep both systems)

The old `wayforpayKey` and `liqpayKey` fields remain in the database, so:

1. **Revert booking flow** to use old fields
2. **Disable new endpoints** temporarily
3. **Investigate issues**
4. **Fix and retry migration**

### Full Rollback (Remove PaymentAccount)

If necessary to completely rollback:

1. **Stop using new system**:
   ```typescript
   // Revert all booking flows to old system
   ```

2. **Optionally remove PaymentAccount data**:
   ```sql
   -- Delete all payment accounts
   DELETE FROM "PaymentAccount";
   ```

3. **Keep schema** for future retry (don't drop table)

## Verification Checklist

After migration, verify:

- [ ] All clubs with old payment keys have corresponding PaymentAccount entries
- [ ] Payment account resolution works correctly
  ```typescript
  const account = await resolvePaymentAccountForBooking(clubId);
  assert(account !== null);
  ```
- [ ] Status endpoint returns correct information
  ```bash
  curl /api/admin/clubs/[clubId]/payment-accounts/status
  # Should show isConfigured: true
  ```
- [ ] Booking payments work with new system
- [ ] Audit logs show payment account creation
  ```sql
  SELECT * FROM "AuditLog" 
  WHERE action = 'payment_account.create' 
  ORDER BY "createdAt" DESC;
  ```
- [ ] Old fields can still be accessed (for rollback safety)
- [ ] No secrets exposed in API responses
  ```bash
  curl /api/admin/clubs/[clubId]/payment-accounts
  # Response should not contain merchantId or secretKey
  ```

## Timeline

Recommended timeline:

1. **Week 1**: Deploy new PaymentAccount system (done)
2. **Week 2**: Run data migration script or manual migration
3. **Week 2-3**: Test new system in staging/production
4. **Week 3-4**: Update booking flow to use new system
5. **Week 4+**: Monitor both systems in parallel
6. **Month 2**: Deprecate old endpoints
7. **Month 6+**: Consider removing old fields

## Support & Troubleshooting

### Common Issues

**Issue**: Migration script fails with "no club owner"
- **Solution**: Assign a club owner first, then retry migration

**Issue**: Encrypted keys don't decrypt
- **Solution**: Verify `ENCRYPTION_KEY` environment variable is set and consistent

**Issue**: Payment account not resolved for booking
- **Solution**: Check that account is active (`isActive = true`)

**Issue**: Root admin blocked from creating payment account
- **Solution**: Expected behavior - only club/org owners can manage payment credentials

### Getting Help

1. Check logs: `AuditLog` table for payment account operations
2. Review documentation: `/docs/payment-account-architecture.md`
3. Verify environment: `ENCRYPTION_KEY` is set
4. Test resolution logic:
   ```typescript
   const status = await getPaymentAccountStatus(clubId);
   console.log(status);
   ```

## Additional Resources

- [Payment Account Architecture](/docs/payment-account-architecture.md)
- [Club Owner Role Documentation](/docs/club-owner-role.md)
- [Role-Based Access Control](../.github/copilot-settings.md)
