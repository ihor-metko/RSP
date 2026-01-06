# Timezone Quick Reference

## TL;DR

- 🔴 **Backend:** UTC only. Always.
- 🟢 **Frontend:** Convert local ↔ UTC
- 🟡 **Database:** All timestamps in UTC
- 🔵 **Club:** Each has IANA timezone (e.g., "Europe/Kyiv")

## Rules

### Backend Rules

❌ **Never:**
```typescript
new Date("2026-01-06 10:00")                    // Ambiguous timezone
const hour = new Date().getHours()              // Server timezone
const utcHour = localHour - 2                   // Hardcoded offset
```

✅ **Always:**
```typescript
import { createUTCDate, isValidUTCString } from '@/utils/utcDateTime';

const start = createUTCDate('2026-01-06', '10:00');
if (!isValidUTCString(body.startTime)) { /* reject */ }
```

### Frontend Rules

❌ **Never:**
```typescript
<p>{booking.start}</p>                          // Shows UTC to user
await api.post({ startTime: "10:00" })         // No timezone context
```

✅ **Always:**
```typescript
import { convertLocalDateTimeToUTC, getLocalTimeString } from '@/utils/timezoneConversion';

// Sending to backend
const utcISO = convertLocalDateTimeToUTC(date, time, club.timezone);
await api.post({ startTime: utcISO });

// Displaying from backend
<p>{getLocalTimeString(booking.start, club.timezone)}</p>
```

## Common Tasks

### Create a Booking (Frontend)

```typescript
const startTimeUTC = convertLocalDateTimeToUTC(
  selectedDate,     // "2026-01-06"
  selectedTime,     // "10:00"
  club.timezone     // "Europe/Kyiv"
);

await fetch('/api/bookings/create', {
  body: JSON.stringify({ startTime: startTimeUTC })
});
```

### Display a Booking (Frontend)

```typescript
const localTime = getLocalTimeString(
  booking.start,    // "2026-01-06T08:00:00.000Z"
  club.timezone     // "Europe/Kyiv"
);
// Result: "10:00"
```

### Check Availability (Backend)

```typescript
import { doUTCRangesOverlap } from '@/utils/utcDateTime';

const hasOverlap = doUTCRangesOverlap(
  booking1Start, booking1End,
  booking2Start, booking2End
);
```

### Validate UTC Input (Backend)

```typescript
import { isValidUTCString } from '@/utils/utcDateTime';

if (!isValidUTCString(body.startTime)) {
  return NextResponse.json(
    { error: "Must be UTC ISO 8601 format (e.g., '2026-01-06T10:00:00.000Z')" },
    { status: 400 }
  );
}
```

## Function Reference

### Backend (`@/utils/utcDateTime`)

| Function | Use Case |
|----------|----------|
| `createUTCDate(date, time)` | Create Date from "YYYY-MM-DD" and "HH:MM" |
| `doUTCRangesOverlap(s1, e1, s2, e2)` | Check if bookings overlap |
| `isValidUTCString(str)` | Validate UTC ISO string |
| `addMinutesUTC(date, mins)` | Add duration to booking |

### Frontend (`@/utils/timezoneConversion`)

| Function | Use Case |
|----------|----------|
| `convertLocalDateTimeToUTC(date, time, tz)` | User input → Backend |
| `getLocalTimeString(utc, tz)` | Backend → Display time |
| `getLocalDateString(utc, tz)` | Backend → Display date |
| `formatUTCToLocal(utc, tz, pattern)` | Custom formatting |

## Examples

### Example 1: User in Kyiv Books 10:00 AM

```typescript
// Frontend (Kyiv UTC+2 in winter)
const utcTime = convertLocalDateTimeToUTC('2026-01-06', '10:00', 'Europe/Kyiv');
// Result: "2026-01-06T08:00:00.000Z"

// Backend stores: "2026-01-06T08:00:00.000Z"

// Frontend displays:
const displayTime = getLocalTimeString('2026-01-06T08:00:00.000Z', 'Europe/Kyiv');
// Result: "10:00"
```

### Example 2: Cross-Timezone Booking

```typescript
// User A in Kyiv books 10:00 local → 08:00 UTC
// User B in New York sees same booking → 03:00 local
// Both see correct time; backend only knows UTC
```

### Example 3: DST Transition

```typescript
// March 27 (before DST): 10:00 local → 08:00 UTC (UTC+2)
// March 29 (after DST):  10:00 local → 07:00 UTC (UTC+3)
// Backend doesn't care; conversions handle DST automatically
```

## Testing Checklist

- [ ] Backend validates UTC format
- [ ] Frontend converts to UTC before sending
- [ ] Frontend converts from UTC for display
- [ ] Tests cover DST transitions
- [ ] Tests cover midnight crossing
- [ ] Tests cover cross-timezone scenarios

## Quick Debugging

```typescript
// Log UTC values
console.log('UTC:', new Date(value).toISOString());

// Check club timezone
console.log('Club TZ:', club.timezone);

// Verify conversion
const utc = convertLocalDateTimeToUTC('2026-01-06', '10:00', 'Europe/Kyiv');
console.log('Converted:', utc); // Should be "2026-01-06T08:00:00.000Z"
```

## Common Errors

| Error | Fix |
|-------|-----|
| "Invalid startTime format" | Use `convertLocalDateTimeToUTC()` |
| Times off by N hours | Verify timezone conversion |
| DST issues | Use IANA timezone, not offset |

## Resources

- Full docs: `/docs/timezone-architecture.md`
- Backend utils: `/src/utils/utcDateTime.ts`
- Frontend utils: `/src/utils/timezoneConversion.ts`
- Tests: `/src/__tests__/timezone*.test.ts`
