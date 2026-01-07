# Backend Timezone Architecture

## Overview

This document describes the **mandatory** backend timezone architecture for ArenaOne. All backend code MUST follow these rules.

---

## 🎯 Core Principles

### 1. **All timestamps are UTC**
- Database stores all `DateTime` fields in UTC
- All API parameters expect UTC
- All API responses return UTC
- All internal logic operates on UTC only

### 2. **No timezone conversion in backend**
- Backend NEVER converts between timezones
- Backend assumes all incoming dates are UTC
- Frontend is responsible for timezone conversion

### 3. **Validate UTC format**
- All API endpoints MUST validate UTC format
- Reject any non-UTC datetime inputs
- Use `isValidUTCString()` utility

---

## 📋 Database Rules

### Prisma DateTime Fields

All `DateTime` fields in Prisma are stored and retrieved in UTC:

```prisma
model Booking {
  id        String   @id @default(uuid())
  start     DateTime // Always UTC
  end       DateTime // Always UTC
  createdAt DateTime @default(now())
}
```

**IMPORTANT:**
- Prisma automatically handles UTC conversion
- Never manipulate timezone in database queries
- Use `new Date()` objects directly with Prisma

---

## 🔧 Backend Implementation Rules

### Rule 1: Always Validate UTC Input

```typescript
// ✅ CORRECT
import { isValidUTCString } from '@/utils/utcDateTime';

export async function POST(request: Request) {
  const { startTime, endTime } = await request.json();

  // Validate UTC format
  if (!isValidUTCString(startTime)) {
    return NextResponse.json(
      { error: "startTime must be UTC ISO 8601 format (e.g., '2026-01-06T10:00:00.000Z')" },
      { status: 400 }
    );
  }

  if (!isValidUTCString(endTime)) {
    return NextResponse.json(
      { error: "endTime must be UTC ISO 8601 format" },
      { status: 400 }
    );
  }

  // Proceed with UTC dates
  const start = new Date(startTime);
  const end = new Date(endTime);
}
```

```typescript
// ❌ WRONG - No validation
const start = new Date(startTime); // Could be any format!
```

---

### Rule 2: Use UTC Utility Functions

Import from `@/utils/utcDateTime`:

```typescript
// ✅ CORRECT
import {
  createUTCDate,
  doUTCRangesOverlap,
  addMinutesUTC,
  getUTCDayBounds,
  isValidUTCString,
} from '@/utils/utcDateTime';

// Create UTC date from components
const startTime = createUTCDate('2026-01-06', '10:00');
// Result: Date object for 2026-01-06T10:00:00.000Z

// Check overlap
const overlap = doUTCRangesOverlap(booking1Start, booking1End, booking2Start, booking2End);

// Add duration
const endTime = addMinutesUTC(startTime, 60);
```

```typescript
// ❌ WRONG - Manual date creation without UTC marker
const startTime = new Date('2026-01-06 10:00'); // Ambiguous!
const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // OK but less clear
```

---

### Rule 3: Overlap Detection

Use `doUTCRangesOverlap()` for all booking conflict checks:

```typescript
// ✅ CORRECT
import { doUTCRangesOverlap } from '@/utils/utcDateTime';

// Check for conflicting bookings using Prisma
const conflictingBooking = await prisma.booking.findFirst({
  where: {
    courtId,
    status: { in: ['pending', 'paid', 'reserved'] },
    start: { lt: end },   // Booking starts before new booking ends
    end: { gt: start },   // Booking ends after new booking starts
  },
});

if (conflictingBooking) {
  return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 });
}
```

**Why this works:**
- Standard interval overlap logic: `(start1 < end2) AND (start2 < end1)`
- Prisma handles UTC comparisons automatically
- No manual overlap logic needed

---

### Rule 4: API Response Format

All API responses MUST return UTC timestamps in ISO 8601 format:

```typescript
// ✅ CORRECT
return NextResponse.json({
  bookingId: booking.id,
  startTime: booking.start.toISOString(), // "2026-01-06T10:00:00.000Z"
  endTime: booking.end.toISOString(),     // "2026-01-06T11:00:00.000Z"
});
```

```typescript
// ❌ WRONG - Loses timezone information
return NextResponse.json({
  startTime: booking.start.toLocaleString(), // "1/6/2026, 10:00:00 AM"
});
```

---

## 📊 Common Patterns

### Pattern 1: Check Availability for Date/Time

```typescript
import { createUTCDate, addMinutesUTC } from '@/utils/utcDateTime';

// Input: date (YYYY-MM-DD) and time (HH:MM) in UTC
const date = '2026-01-06';
const time = '10:00';
const duration = 60;

// Create UTC boundaries
const slotStart = createUTCDate(date, time);
const slotEnd = addMinutesUTC(slotStart, duration);

// Query bookings
const bookings = await prisma.booking.findMany({
  where: {
    courtId,
    start: { lt: slotEnd },
    end: { gt: slotStart },
    status: { in: ['reserved', 'paid', 'pending'] },
  },
});

// Court is available if no bookings found
const isAvailable = bookings.length === 0;
```

---

### Pattern 2: Get Day Boundaries

```typescript
import { getUTCDayBounds } from '@/utils/utcDateTime';

// Get all bookings for a specific day (UTC)
const date = '2026-01-06';
const { startOfDay, endOfDay } = getUTCDayBounds(date);

const bookings = await prisma.booking.findMany({
  where: {
    courtId,
    start: { gte: startOfDay, lt: endOfDay },
  },
});
```

---

### Pattern 3: Calculate Price Based on Duration

```typescript
import { getDurationMinutes } from '@/utils/utcDateTime';

const start = new Date(booking.start);
const end = new Date(booking.end);

const durationMinutes = getDurationMinutes(start, end);
const priceCents = Math.round((court.defaultPriceCents / 60) * durationMinutes);
```

---

## 🚫 Forbidden Patterns

### ❌ Never Use Local Timezone

```typescript
// ❌ WRONG - Uses server's local timezone
const today = new Date().toLocaleDateString();

// ✅ CORRECT - Use UTC
import { getTodayUTC } from '@/utils/utcDateTime';
const today = getTodayUTC(); // "2026-01-06"
```

---

### ❌ Never Parse Without UTC Marker

```typescript
// ❌ WRONG - Ambiguous timezone
const date = new Date('2026-01-06 10:00');

// ✅ CORRECT - Explicit UTC
const date = new Date('2026-01-06T10:00:00.000Z');
// OR
import { createUTCDate } from '@/utils/utcDateTime';
const date = createUTCDate('2026-01-06', '10:00');
```

---

### ❌ Never Use Hardcoded Offsets

```typescript
// ❌ WRONG - Offset breaks during DST
const kyivTime = new Date(utcTime.getTime() + 2 * 60 * 60 * 1000);

// ✅ CORRECT - No conversion in backend
// Return UTC, let frontend handle timezone conversion
return { time: utcTime.toISOString() };
```

---

## 📝 API Endpoint Checklist

For every API endpoint that handles datetime:

- [ ] Validate all datetime inputs with `isValidUTCString()`
- [ ] Document that parameters must be UTC
- [ ] Use UTC utility functions from `@/utils/utcDateTime`
- [ ] Return all datetimes as ISO 8601 UTC strings
- [ ] Add JSDoc comment explaining UTC requirement
- [ ] Test with UTC timestamps
- [ ] Never assume server timezone

---

## 🧪 Testing Guidelines

### Test UTC Validation

```typescript
it('should reject non-UTC datetime formats', async () => {
  const response = await POST(new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({
      startTime: '2026-01-06T10:00:00', // Missing 'Z'
      endTime: '2026-01-06T11:00:00+02:00', // Offset instead of UTC
    }),
  }));

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toContain('UTC ISO 8601 format');
});
```

### Test Overlap Detection

```typescript
it('should detect booking conflicts', async () => {
  // Create existing booking
  await prisma.booking.create({
    data: {
      courtId: 'court-1',
      start: new Date('2026-01-06T10:00:00.000Z'),
      end: new Date('2026-01-06T11:00:00.000Z'),
      status: 'reserved',
    },
  });

  // Try to book overlapping slot
  const response = await POST(new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({
      courtId: 'court-1',
      startTime: '2026-01-06T10:30:00.000Z',
      endTime: '2026-01-06T11:30:00.000Z',
    }),
  }));

  expect(response.status).toBe(409);
});
```

---

## 📚 Reference

### Available UTC Utilities

From `@/utils/utcDateTime`:

| Function | Purpose |
|----------|---------|
| `isValidUTCString(str)` | Validate ISO 8601 UTC format |
| `isValidDateString(str)` | Validate YYYY-MM-DD format |
| `isValidTimeString(str)` | Validate HH:MM format |
| `createUTCDate(date, time)` | Create UTC Date from components |
| `doUTCRangesOverlap(s1, e1, s2, e2)` | Check if two ranges overlap |
| `getUTCDateString(date)` | Extract YYYY-MM-DD from Date |
| `getUTCTimeString(date)` | Extract HH:MM from Date |
| `getUTCDayBounds(date)` | Get start/end of day in UTC |
| `addMinutesUTC(date, mins)` | Add minutes to UTC date |
| `getDurationMinutes(start, end)` | Calculate duration in minutes |
| `isValidUTCRange(start, end)` | Validate end > start |
| `getTodayUTC()` | Get today's date (YYYY-MM-DD) |
| `getNowUTC()` | Get current UTC timestamp |

---

### Club Timezone Constants

From `@/constants/timezone`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_CLUB_TIMEZONE` | `"Europe/Kyiv"` | Default timezone for all clubs |
| `getClubTimezone(tz)` | Function | Get club timezone with fallback |
| `isValidIANATimezone(tz)` | Function | Validate IANA timezone string |

**Note:** Backend should NOT use these for conversion, only for validation or storage.

---

## ✅ Migration Strategy

When refactoring existing code:

1. **Find all `new Date()` calls**
   ```bash
   grep -r "new Date(" src/app/api/
   ```

2. **Replace with UTC utilities**
   - `new Date('2026-01-06T10:00:00.000Z')` → `createUTCDate('2026-01-06', '10:00')`
   - Manual overlap logic → `doUTCRangesOverlap()`

3. **Add validation**
   - All API endpoints → `isValidUTCString()`

4. **Update tests**
   - Use UTC timestamps in test data
   - Verify `.toISOString()` in assertions

---

## 🔒 Security Considerations

**Why UTC validation is critical:**

1. **Prevents timezone injection attacks**
   - Malicious clients could send non-UTC dates
   - Could create bookings in wrong time slots

2. **Ensures data consistency**
   - All bookings comparable
   - No ambiguous timestamps

3. **Prevents DST-related bugs**
   - UTC has no DST transitions
   - Predictable behavior year-round

---

**Remember:** Backend is timezone-agnostic. It only knows UTC.
