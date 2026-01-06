# Timezone Architecture Documentation

## Overview

ArenaOne implements a **UTC-centric, club-aware timezone architecture** to ensure accurate booking and availability management across multiple timezones with full DST (Daylight Saving Time) support.

## Core Principles

### 1. UTC-Only Backend

**All backend logic operates exclusively on UTC timestamps.**

- ✅ All database timestamps stored in UTC
- ✅ All API parameters expected in UTC ISO 8601 format
- ✅ All comparisons and overlap detection done in UTC
- ✅ All availability calculations done in UTC

❌ **Forbidden in Backend:**
```typescript
// WRONG: Implicit timezone parsing
new Date("2026-01-06 10:00")

// WRONG: Using local timezone
const now = new Date();
const hour = now.getHours(); // Uses server timezone!

// WRONG: Timezone offset in API
const startTime = "2026-01-06T10:00:00+02:00"
```

✅ **Required in Backend:**
```typescript
// CORRECT: UTC ISO string with 'Z' suffix
const startTime = "2026-01-06T10:00:00.000Z"

// CORRECT: UTC utilities
import { createUTCDate, doUTCRangesOverlap } from '@/utils/utcDateTime';
const start = createUTCDate('2026-01-06', '10:00');
const end = addMinutesUTC(start, 60);
```

### 2. Club-Specific Timezone

**Each club has a timezone property (IANA format).**

- Club timezone stored as IANA string (e.g., "Europe/Kyiv", "America/New_York")
- Default timezone: "Europe/Kyiv" (set in migration)
- Timezone is future-editable but not currently exposed in UI
- DST transitions handled automatically by IANA timezone

```typescript
// Club schema
model Club {
  timezone String @default("Europe/Kyiv")
  // ... other fields
}
```

### 3. Frontend Timezone Conversion

**Frontend is responsible for all timezone conversions.**

The frontend performs two types of conversions:

1. **Local → UTC** (when sending to backend)
2. **UTC → Local** (when displaying from backend)

```typescript
import { convertLocalDateTimeToUTC, getLocalTimeString } from '@/utils/timezoneConversion';

// User selects "2026-01-06 10:00" in club local time
const utcISO = convertLocalDateTimeToUTC(
  '2026-01-06',  // Local date
  '10:00',       // Local time
  club.timezone  // e.g., "Europe/Kyiv"
);
// Result: "2026-01-06T08:00:00.000Z" (UTC)

// Display UTC time in club local time
const localTime = getLocalTimeString(
  '2026-01-06T08:00:00.000Z',  // UTC from backend
  club.timezone
);
// Result: "10:00" (local time in Kyiv)
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                                                             │
│  User sees:        10:00 (Kyiv local time)                 │
│                      ↓                                      │
│  Conversion:   convertLocalDateTimeToUTC()                 │
│                      ↓                                      │
│  API sends:    "2026-01-06T08:00:00.000Z" (UTC)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      HTTPS Request
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│                                                             │
│  Validation:   isValidUTCString()                          │
│                      ↓                                      │
│  Processing:   All logic in UTC                            │
│                - Overlap detection (UTC ↔ UTC)             │
│                - Availability checks (UTC)                 │
│                - Price calculation (UTC)                   │
│                      ↓                                      │
│  Database:     Stores "2026-01-06T08:00:00.000Z"          │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      Response (UTC)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                                                             │
│  API returns:  "2026-01-06T08:00:00.000Z" (UTC)           │
│                      ↓                                      │
│  Conversion:   getLocalTimeString()                        │
│                      ↓                                      │
│  User sees:        10:00 (Kyiv local time)                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: Creating a Booking (Kyiv User)

**User Action:** Books court on Jan 6, 2026 at 10:00 AM (Kyiv time)

1. **Frontend (Kyiv timezone, UTC+2 in winter):**
   ```typescript
   const clubTimezone = "Europe/Kyiv";
   const selectedDate = "2026-01-06";
   const selectedTime = "10:00";
   
   const utcStartTime = convertLocalDateTimeToUTC(
     selectedDate,
     selectedTime,
     clubTimezone
   );
   // Result: "2026-01-06T08:00:00.000Z"
   ```

2. **API Request:**
   ```json
   {
     "courtId": "abc123",
     "startTime": "2026-01-06T08:00:00.000Z",
     "endTime": "2026-01-06T09:00:00.000Z"
   }
   ```

3. **Backend Validation:**
   ```typescript
   if (!isValidUTCString(body.startTime)) {
     return NextResponse.json(
       { error: "Invalid startTime format. Must be UTC ISO 8601 format" },
       { status: 400 }
     );
   }
   ```

4. **Database:**
   ```sql
   INSERT INTO "Booking" (start, end, ...)
   VALUES ('2026-01-06T08:00:00.000Z', '2026-01-06T09:00:00.000Z', ...);
   ```

5. **Frontend Display:**
   ```typescript
   const localTime = getLocalTimeString(booking.start, club.timezone);
   // Displays: "10:00" (back to Kyiv local time)
   ```

### Example 2: Cross-Timezone Booking (New York User, Kyiv Club)

**Scenario:** User in New York (UTC-5) books a court in Kyiv club

1. **New York User selects:** Jan 6, 2026 at 3:00 AM (New York time)
2. **Frontend converts to UTC:** "2026-01-06T08:00:00.000Z"
3. **Backend processes:** Stores UTC time
4. **Kyiv Club Owner sees:** 10:00 AM (Kyiv time)
5. **New York User sees:** 3:00 AM (New York time)

**Result:** Both users see the correct time in their respective timezones, but backend only works with UTC.

### Example 3: DST Transition (Spring Forward)

**Scenario:** Kyiv transitions from UTC+2 to UTC+3 on March 28, 2026

**Before DST (March 27):**
- User selects: 10:00 AM local
- Frontend converts: "2026-03-27T08:00:00.000Z" (UTC+2)

**After DST (March 29):**
- User selects: 10:00 AM local
- Frontend converts: "2026-03-29T07:00:00.000Z" (UTC+3)

**Backend:** Doesn't care about DST! All times are in UTC.

## API Endpoint Requirements

### Backend Endpoint Checklist

All booking and availability endpoints MUST:

- [ ] Validate UTC format using `isValidUTCString()`
- [ ] Use UTC utilities from `@/utils/utcDateTime`
- [ ] Return UTC ISO strings with 'Z' suffix
- [ ] Document timezone requirements in comments

#### Example: Correct Endpoint Implementation

```typescript
import { isValidUTCString, doUTCRangesOverlap } from '@/utils/utcDateTime';

/**
 * POST /api/bookings/create
 * 
 * IMPORTANT TIMEZONE RULE:
 * This endpoint expects startTime and endTime in UTC ISO 8601 format
 * (e.g., "2026-01-06T10:00:00.000Z")
 * Frontend MUST convert club local time to UTC before sending the request
 */
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate UTC format - CRITICAL for timezone safety
  if (!isValidUTCString(body.startTime)) {
    return NextResponse.json(
      { error: "Invalid startTime format. Must be UTC ISO 8601 format" },
      { status: 400 }
    );
  }
  
  // All processing in UTC
  const startTime = new Date(body.startTime);
  const endTime = new Date(body.endTime);
  
  // Check overlaps using UTC
  const overlapping = await prisma.booking.findFirst({
    where: {
      courtId: body.courtId,
      start: { lt: endTime },
      end: { gt: startTime },
      status: { in: ["reserved", "paid"] },
    },
  });
  
  // ... rest of implementation
}
```

## Frontend Implementation Guide

### Required Imports

```typescript
import {
  convertLocalDateTimeToUTC,
  getLocalDateString,
  getLocalTimeString,
  formatUTCToLocal,
} from '@/utils/timezoneConversion';
```

### User Input → Backend

```typescript
// User selects date and time in a form
const handleBooking = async () => {
  const selectedDate = "2026-01-06"; // From date picker
  const selectedTime = "10:00";      // From time picker
  
  // Convert to UTC before sending to backend
  const startTimeUTC = convertLocalDateTimeToUTC(
    selectedDate,
    selectedTime,
    club.timezone
  );
  
  const endTimeUTC = convertLocalDateTimeToUTC(
    selectedDate,
    calculateEndTime(selectedTime, duration),
    club.timezone
  );
  
  // Send to backend
  await fetch('/api/bookings/create', {
    method: 'POST',
    body: JSON.stringify({
      courtId: courtId,
      startTime: startTimeUTC,  // UTC ISO string
      endTime: endTimeUTC,      // UTC ISO string
    }),
  });
};
```

### Backend → Display

```typescript
// Backend returns booking with UTC timestamps
const booking = {
  id: "123",
  start: "2026-01-06T08:00:00.000Z",
  end: "2026-01-06T09:00:00.000Z",
};

// Display in club local time
const displayDate = getLocalDateString(booking.start, club.timezone);
const displayStartTime = getLocalTimeString(booking.start, club.timezone);
const displayEndTime = getLocalTimeString(booking.end, club.timezone);

// Render
return (
  <div>
    <p>Date: {displayDate}</p>
    <p>Time: {displayStartTime} - {displayEndTime}</p>
  </div>
);
```

## Utility Functions Reference

### Backend Utilities (`@/utils/utcDateTime`)

| Function | Purpose | Example |
|----------|---------|---------|
| `createUTCDate(date, time)` | Create UTC Date from strings | `createUTCDate('2026-01-06', '10:00')` |
| `doUTCRangesOverlap(...)` | Check if two UTC ranges overlap | `doUTCRangesOverlap(start1, end1, start2, end2)` |
| `addMinutesUTC(date, mins)` | Add minutes to UTC date | `addMinutesUTC(startDate, 60)` |
| `getUTCDayBounds(date)` | Get start/end of day in UTC | `getUTCDayBounds('2026-01-06')` |
| `isValidUTCString(str)` | Validate UTC ISO string | `isValidUTCString('2026-01-06T10:00:00.000Z')` |

### Frontend Utilities (`@/utils/timezoneConversion`)

| Function | Purpose | Example |
|----------|---------|---------|
| `convertLocalDateTimeToUTC(date, time, tz)` | Convert local to UTC | `convertLocalDateTimeToUTC('2026-01-06', '10:00', 'Europe/Kyiv')` |
| `getLocalDateString(utc, tz)` | Extract local date from UTC | `getLocalDateString('2026-01-06T08:00:00.000Z', 'Europe/Kyiv')` |
| `getLocalTimeString(utc, tz)` | Extract local time from UTC | `getLocalTimeString('2026-01-06T08:00:00.000Z', 'Europe/Kyiv')` |
| `formatUTCToLocal(utc, tz, pattern)` | Format UTC to local time | `formatUTCToLocal(utcDate, 'Europe/Kyiv', 'HH:mm')` |

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Mixing Timezones in Backend

**Problem:**
```typescript
// Backend code
const start = new Date("2026-01-06 10:00"); // Ambiguous! What timezone?
```

**Solution:**
```typescript
// Always use UTC utilities
const start = createUTCDate("2026-01-06", "10:00");
```

### ❌ Pitfall 2: Displaying UTC Time Directly

**Problem:**
```typescript
// Frontend code
<p>Time: {booking.start}</p> // Shows "2026-01-06T08:00:00.000Z"
```

**Solution:**
```typescript
<p>Time: {getLocalTimeString(booking.start, club.timezone)}</p> // Shows "10:00"
```

### ❌ Pitfall 3: Hardcoding Timezone Offset

**Problem:**
```typescript
const utcHour = localHour - 2; // WRONG! Breaks during DST
```

**Solution:**
```typescript
const utcISO = convertLocalDateTimeToUTC(date, time, club.timezone); // Handles DST
```

### ❌ Pitfall 4: Server Local Timezone

**Problem:**
```typescript
const now = new Date();
const hour = now.getHours(); // Uses server timezone!
```

**Solution:**
```typescript
const now = new Date();
const hourUTC = now.getUTCHours(); // Always use UTC methods
```

## Testing Requirements

### Backend Tests

All booking/availability logic must have tests for:
- ✅ UTC date creation
- ✅ Overlap detection in UTC
- ✅ Cross-timezone scenarios
- ✅ Midnight crossing
- ✅ DST transitions

### Frontend Tests

All timezone conversion code must have tests for:
- ✅ Local → UTC conversion
- ✅ UTC → Local conversion
- ✅ Round-trip accuracy
- ✅ DST handling
- ✅ Edge cases (midnight, end of day)

## Migration & Backward Compatibility

### Database Migration

All existing clubs have been migrated to have timezone = "Europe/Kyiv":

```sql
-- Migration: 20260105234015_update_club_timezone_default
UPDATE "Club" SET "timezone" = 'Europe/Kyiv' WHERE "timezone" IS NULL;
UPDATE "Club" SET "timezone" = 'Europe/Kyiv' WHERE "timezone" = 'UTC';
ALTER TABLE "Club" ALTER COLUMN "timezone" SET NOT NULL;
ALTER TABLE "Club" ALTER COLUMN "timezone" SET DEFAULT 'Europe/Kyiv';
```

### Existing Bookings

Existing bookings are assumed to be stored in UTC. No data migration needed.

## Future Enhancements

### Multi-Club Support (Future)

When clubs in different timezones are added:

1. Each club will have its own timezone
2. Frontend uses club.timezone for conversions
3. Backend remains UTC-only
4. No code changes needed (architecture supports this)

### Timezone Editing UI (Future)

To allow admins to change club timezone:

1. Add UI to club settings
2. Validate IANA timezone format
3. Update club.timezone field
4. Display warning about existing bookings

**Note:** Architecture already supports this; only UI needed.

## Glossary

| Term | Definition |
|------|------------|
| **UTC** | Coordinated Universal Time - Global time standard with no DST |
| **IANA Timezone** | Timezone format (e.g., "Europe/Kyiv") that handles DST automatically |
| **Timezone Offset** | Hours difference from UTC (e.g., UTC+2). **Not used** because it doesn't handle DST |
| **DST** | Daylight Saving Time - Seasonal time shift (e.g., UTC+2 → UTC+3) |
| **ISO 8601** | Standard datetime format: "2026-01-06T10:00:00.000Z" |
| **Zoned Time** | Local time in a specific timezone |
| **Club Local Time** | Time in the club's timezone (what users see) |

## Support & Troubleshooting

### How to verify timezone handling is correct?

1. Check backend endpoint validates UTC: `isValidUTCString()`
2. Check frontend converts to UTC: `convertLocalDateTimeToUTC()`
3. Check display converts from UTC: `getLocalTimeString()`
4. Run timezone tests: `npm test -- timezone`

### How to debug timezone issues?

1. **Log UTC values:**
   ```typescript
   console.log('UTC startTime:', utcStartTime);
   console.log('UTC ISO:', new Date(utcStartTime).toISOString());
   ```

2. **Verify club timezone:**
   ```typescript
   console.log('Club timezone:', club.timezone);
   ```

3. **Check DST status:**
   ```typescript
   import { isDST } from '@/utils/timezoneConversion';
   console.log('Is DST?', isDST(new Date(), club.timezone));
   ```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid startTime format. Must be UTC ISO 8601" | Frontend sent non-UTC time | Use `convertLocalDateTimeToUTC()` |
| "Selected time slot is already booked" | Possible timezone mismatch | Verify frontend sends UTC |
| Times display incorrectly | Frontend not converting from UTC | Use `getLocalTimeString()` |

---

**Last Updated:** 2026-01-06  
**Version:** 1.0  
**Status:** Production-Ready
