# Frontend Timezone Handling Guide

## Overview

This document describes the **mandatory** timezone architecture for the ArenaOne platform. All frontend code MUST follow these rules to ensure correct booking and availability handling.

---

## 🎯 Core Principles

### 1. **Backend operates EXCLUSIVELY in UTC**
- All database timestamps are stored in UTC
- All API endpoints expect and return UTC timestamps
- All backend logic (availability checks, booking overlaps) operates on UTC only

### 2. **Each club has a timezone**
- Stored in `club.timezone` field (IANA format, e.g., `"Europe/Kyiv"`)
- Default: `"Europe/Kyiv"` for all clubs
- Future: Will be configurable per club

### 3. **Timezone conversion happens ONLY on the frontend**
- Frontend displays times in club's local timezone
- Frontend converts club local time → UTC before API calls
- Frontend converts UTC → club local time when displaying

---

## 📋 Required Libraries

The frontend MUST use timezone-safe libraries:

```bash
npm install date-fns date-fns-tz
```

**Why `date-fns-tz`?**
- Handles DST transitions correctly
- Uses IANA timezone database
- Avoids hardcoded UTC offsets

---

## 🔧 Frontend Implementation Rules

### Rule 1: Always use `club.timezone`

```typescript
// ✅ CORRECT
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Get club timezone from API response
const clubTimezone = club.timezone; // "Europe/Kyiv"

// Convert user-selected local time to UTC before sending to backend
const localDateTime = new Date(2026, 0, 6, 10, 0); // User selected 10:00 AM
const utcDateTime = zonedTimeToUtc(localDateTime, clubTimezone);

// Send UTC to backend
await fetch('/api/bookings', {
  method: 'POST',
  body: JSON.stringify({
    courtId: '...',
    startTime: utcDateTime.toISOString(), // "2026-01-06T08:00:00.000Z" (10:00 Kyiv = 08:00 UTC)
    endTime: ...
  })
});
```

```typescript
// ❌ WRONG - Never assume timezone
const localDateTime = new Date('2026-01-06 10:00'); // Ambiguous timezone!
const utcDateTime = new Date('2026-01-06 10:00Z'); // Assumes 10:00 is already UTC!
```

---

### Rule 2: Convert UTC → Local for Display

```typescript
// ✅ CORRECT
import { utcToZonedTime, format } from 'date-fns-tz';

// Backend returns UTC timestamp
const booking = await fetchBooking();
const utcStart = new Date(booking.startTime); // "2026-01-06T08:00:00.000Z"

// Convert to club local time for display
const localStart = utcToZonedTime(utcStart, club.timezone);

// Format for display
const displayTime = format(localStart, 'HH:mm', { timeZone: club.timezone });
// Result: "10:00" (Kyiv local time)
```

```typescript
// ❌ WRONG - Displays in user's browser timezone
const displayTime = new Date(booking.startTime).toLocaleTimeString();
```

---

### Rule 3: Availability Queries

When checking availability for a specific time:

```typescript
// ✅ CORRECT
import { zonedTimeToUtc } from 'date-fns-tz';

// User wants to book 10:00-11:00 on 2026-01-06 in club local time
const date = '2026-01-06';
const startTime = '10:00';
const clubTimezone = club.timezone; // "Europe/Kyiv"

// Create local date-time
const localStart = new Date(`${date}T${startTime}:00`);

// Convert to UTC
const utcStart = zonedTimeToUtc(localStart, clubTimezone);

// Extract UTC time string
const utcTimeString = format(utcStart, 'HH:mm', { timeZone: 'UTC' });
// Result: "08:00"

// Call API with UTC parameters
const response = await fetch(
  `/api/clubs/${clubId}/available-courts?date=${date}&start=${utcTimeString}&duration=60`
);
```

---

### Rule 4: Display Booking Calendar

```typescript
// ✅ CORRECT
import { utcToZonedTime, format } from 'date-fns-tz';

// Fetch bookings from backend (all in UTC)
const bookings = await fetchBookings();

// Convert each booking to club local time for display
const localBookings = bookings.map(booking => ({
  ...booking,
  localStart: utcToZonedTime(new Date(booking.start), club.timezone),
  localEnd: utcToZonedTime(new Date(booking.end), club.timezone),
}));

// Render
localBookings.forEach(booking => {
  console.log(format(booking.localStart, 'HH:mm', { timeZone: club.timezone }));
});
```

---

## 🚫 Common Mistakes to Avoid

### ❌ Mistake 1: Using browser timezone

```typescript
// ❌ WRONG
const localTime = new Date().toLocaleTimeString(); // Uses browser timezone!
```

### ❌ Mistake 2: Hardcoding UTC offsets

```typescript
// ❌ WRONG - Breaks during DST transitions
const utcTime = new Date(localTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours hardcoded
```

### ❌ Mistake 3: Not converting before API calls

```typescript
// ❌ WRONG - Sends local time directly to backend
await fetch('/api/bookings', {
  body: JSON.stringify({
    startTime: '2026-01-06T10:00:00' // Missing 'Z' marker, ambiguous timezone!
  })
});
```

---

## 📊 Example: Complete Booking Flow

### Step 1: User selects time slot
```typescript
// User selects 10:00 AM on 2026-01-06 in the booking UI
const selectedDate = '2026-01-06';
const selectedTime = '10:00';
const duration = 60; // minutes

// Fetch club data
const club = await fetchClub(clubId);
const clubTimezone = club.timezone; // "Europe/Kyiv"
```

### Step 2: Convert to UTC for availability check
```typescript
import { zonedTimeToUtc, format } from 'date-fns-tz';

// Create local date-time
const localDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

// Convert to UTC
const utcDateTime = zonedTimeToUtc(localDateTime, clubTimezone);

// Extract UTC time for API
const utcTimeString = format(utcDateTime, 'HH:mm', { timeZone: 'UTC' });
// Result: "08:00" (10:00 Kyiv = 08:00 UTC)
```

### Step 3: Check availability
```typescript
const response = await fetch(
  `/api/clubs/${clubId}/available-courts?` +
  `date=${selectedDate}&` +
  `start=${utcTimeString}&` +
  `duration=${duration}`
);

const { availableCourts } = await response.json();
```

### Step 4: Create booking with UTC timestamp
```typescript
const endUtc = new Date(utcDateTime.getTime() + duration * 60 * 1000);

await fetch('/api/admin/bookings/create', {
  method: 'POST',
  body: JSON.stringify({
    courtId: selectedCourt.id,
    userId: selectedUser.id,
    startTime: utcDateTime.toISOString(), // "2026-01-06T08:00:00.000Z"
    endTime: endUtc.toISOString(),        // "2026-01-06T09:00:00.000Z"
  })
});
```

### Step 5: Display confirmation
```typescript
import { utcToZonedTime, format } from 'date-fns-tz';

// Convert back to local for display
const localStart = utcToZonedTime(utcDateTime, clubTimezone);
const localEnd = utcToZonedTime(endUtc, clubTimezone);

// Show to user
alert(`Booking confirmed: ${format(localStart, 'HH:mm', { timeZone: clubTimezone })} - ${format(localEnd, 'HH:mm', { timeZone: clubTimezone })}`);
// Result: "Booking confirmed: 10:00 - 11:00"
```

---

## 🧪 Testing Guidelines

When writing frontend tests:

1. **Mock club timezone**
   ```typescript
   const mockClub = { timezone: 'Europe/Kyiv', ... };
   ```

2. **Test DST transitions**
   ```typescript
   // Test dates around DST change (last Sunday in March and October for Europe/Kyiv)
   const dstStart = '2026-03-29'; // DST starts
   const dstEnd = '2026-10-25';   // DST ends
   ```

3. **Verify UTC conversion**
   ```typescript
   expect(utcDateTime.toISOString()).toBe('2026-01-06T08:00:00.000Z');
   ```

---

## 📚 API Endpoint Reference

### `/api/clubs/{id}/available-courts`
**Parameters (all UTC):**
- `date`: YYYY-MM-DD format
- `start`: HH:MM format (UTC time)
- `duration`: number (minutes)

**Frontend must:**
- Convert club local time to UTC time before calling
- Example: 10:00 Kyiv → 08:00 UTC

### `/api/admin/bookings/create`
**Body (all UTC):**
- `startTime`: ISO 8601 UTC string (e.g., `"2026-01-06T08:00:00.000Z"`)
- `endTime`: ISO 8601 UTC string

**Frontend must:**
- Use `.toISOString()` to ensure 'Z' suffix
- Validate format before sending

---

## ✅ Checklist

Before deploying frontend code:

- [ ] All API calls use UTC timestamps
- [ ] All display times use `utcToZonedTime()`
- [ ] All user inputs use `zonedTimeToUtc()`
- [ ] No hardcoded UTC offsets
- [ ] No `new Date('2026-01-06 10:00')` without timezone
- [ ] Always use `club.timezone` from API response
- [ ] Test across DST boundaries
- [ ] Verify `.toISOString()` for all backend calls

---

## 🔗 Resources

- [date-fns-tz documentation](https://github.com/marnusw/date-fns-tz)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [ISO 8601 Format](https://en.wikipedia.org/wiki/ISO_8601)

---

**Remember:** When in doubt, log the UTC ISO string:
```typescript
console.log('Sending to backend:', utcDateTime.toISOString());
// Should always end with 'Z'
```
