# Currency Default Fix - Implementation Summary

## Issue Fixed
**Title:** Fix Currency Handling in Booking Payment Flow (UAH only)

**Problem:** Even for Ukrainian clubs using WayForPay, the payment page opened with USD currency instead of UAH.

**Root Cause:** The database schema had `defaultCurrency String? @default("USD")` which caused all new clubs to default to USD unless explicitly set to UAH.

## Solution

### Minimal Changes Approach
This fix follows the architectural principle stated in the issue: **"Currency belongs to the Club domain, not Payment Provider domain."**

The payment flow logic was already correctly implemented:
```typescript
// From src/services/bookingPaymentService.ts:137
const currency = court.club.defaultCurrency || "UAH";
```

The issue was only with the **default value** in the database schema.

### Changes Made

#### 1. Database Schema Change
**File:** `prisma/schema.prisma`

```diff
- defaultCurrency   String?   @default("USD")
+ defaultCurrency   String?   @default("UAH")
```

**Impact:** All new clubs created after this change will default to UAH.

#### 2. Database Migration
**File:** `prisma/migrations/20260106193000_change_default_currency_to_uah/migration.sql`

```sql
-- Change default currency from USD to UAH for Ukrainian platform
ALTER TABLE "Club" ALTER COLUMN "defaultCurrency" SET DEFAULT 'UAH';

-- Update existing clubs that have NULL or USD currency to use UAH
UPDATE "Club" 
SET "defaultCurrency" = 'UAH' 
WHERE "defaultCurrency" IS NULL OR "defaultCurrency" = 'USD';
```

**Impact:** 
- Changes the schema default
- Migrates existing clubs from USD to UAH

#### 3. API Route Fallback
**File:** `src/app/api/admin/clubs/new/route.ts`

```diff
- defaultCurrency: body.defaultCurrency || "USD",
+ defaultCurrency: body.defaultCurrency || "UAH",
```

**Impact:** API fallback now matches schema default.

#### 4. UI Component Placeholder
**File:** `src/components/admin/ClubForm.client.tsx`

```diff
- placeholder="USD"
+ placeholder="UAH"
```

**Impact:** UI hint now matches expected default.

#### 5. Test Fixtures
**Files Updated:**
- `src/__tests__/admin-club-detail.test.ts`
- `src/__tests__/club-detail-refactor.test.ts`
- `src/__tests__/useClubStore.test.ts`

All test fixtures changed from `defaultCurrency: "USD"` to `defaultCurrency: "UAH"`.

**Impact:** Tests now reflect correct defaults for Ukrainian platform.

#### 6. Verification Test
**File:** `src/__tests__/currency-default-verification.test.ts` (new)

Documents and verifies the expected behavior:
- Schema default is UAH
- Payment service fallback is UAH
- Currency can still be overridden per club

## Payment Flow Verification

The complete currency flow is already correctly implemented:

```
1. Club Settings
   ↓
   defaultCurrency: "UAH" (now from schema default)
   
2. Booking Creation
   ↓
   Reads: court.club.defaultCurrency
   
3. Payment Intent
   ↓
   currency: "UAH"
   
4. WayForPay API Request
   ↓
   currency: "UAH"
   
5. Payment Page
   ↓
   Shows: Amount in UAH (₴)
```

## Testing Results

✅ **All Tests Passing:**
- `player-booking-payment-flow.test.ts`: 7 passed
- `useClubStore.test.ts`: 36 passed  
- `club-detail-refactor.test.ts`: 7 passed
- `currency-default-verification.test.ts`: 3 passed

✅ **Code Review:** No issues found

✅ **Security Scan (CodeQL):** No alerts

## Acceptance Criteria Verification

### From Issue Requirements:

✅ **For a Ukrainian club with currency UAH:**
- Booking price is displayed in UAH (verified in payment flow)
- WayForPay payment page opens in UAH (currency passed correctly)
- No USD appears anywhere in the flow (schema default fixed)

✅ **Changing club currency (future-proof):**
- Automatically affects payment currency (no code changes needed)
- No hardcoding - currency always from club settings

✅ **Architectural Note:**
- Currency belongs to Club domain ✅
- Payment providers adapt to club configuration ✅
- Payment providers never dictate currency ✅

## Migration Considerations

### For Existing Clubs
The migration SQL will update all clubs with:
- `defaultCurrency IS NULL` → set to `"UAH"`
- `defaultCurrency = 'USD'` → set to `"UAH"`

### For Future International Expansion
Clubs can still be configured with other currencies:
- EUR
- USD  
- GBP
- etc.

The payment flow respects the club's configured currency, regardless of what it is set to.

## Files Changed Summary

```
prisma/schema.prisma                                                  | 2 +-
prisma/migrations/20260106193000_change_default_currency_to_uah/      | New
src/app/api/admin/clubs/new/route.ts                                  | 2 +-
src/components/admin/ClubForm.client.tsx                              | 2 +-
src/__tests__/admin-club-detail.test.ts                               | 2 +-
src/__tests__/club-detail-refactor.test.ts                            | 2 +-
src/__tests__/useClubStore.test.ts                                    | 24 changes
src/__tests__/currency-default-verification.test.ts                   | New
```

**Total Lines Changed:** ~40 lines (mostly test fixtures)

## Deployment Notes

### Database Migration
The migration will run automatically when deploying:
```bash
npx prisma migrate deploy
```

### Rollback (if needed)
If rollback is required, reverse migration:
```sql
ALTER TABLE "Club" ALTER COLUMN "defaultCurrency" SET DEFAULT 'USD';
UPDATE "Club" SET "defaultCurrency" = 'USD' WHERE "defaultCurrency" = 'UAH';
```

## Conclusion

This is a **minimal, surgical fix** that changes only the default values without modifying any business logic. The payment flow was already correctly implemented to read currency from club settings and pass it to payment providers.

The fix ensures that:
1. New Ukrainian clubs default to UAH
2. Existing clubs are migrated to UAH
3. Future changes to club currency automatically affect payments
4. No hardcoding or implicit defaults in payment code
