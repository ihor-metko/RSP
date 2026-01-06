# Weekly Court Availability - Date Logic Documentation

## Overview

This document describes the date logic implementation for the Weekly Court Availability feature, including the two display modes and helper functions for timezone-safe date handling.

## Display Modes

### 1. Rolling Mode (Default)

**Behavior:**
- Always starts from **today** (club local date)
- Shows today + next 6 consecutive days
- **Never displays past dates**
- Automatically updates when the date changes

**Use Case:**
- Default booking view
- Mobile-first player experience
- Prevents confusion with past availability

**Example:**
- Today is Tuesday, Jan 16
- Displays: Tue 16 → Wed 17 → Thu 18 → Fri 19 → Sat 20 → Sun 21 → Mon 22

**Helper Function:**
```typescript
import { getRolling7Days } from '@/utils/dateTime';

// Get today + next 6 days
const days = getRolling7Days();
// Returns: ["2024-01-16", "2024-01-17", ..., "2024-01-22"]

// Or specify a start date
const customDays = getRolling7Days(new Date("2024-01-16"));
```

### 2. Calendar Mode

**Behavior:**
- Shows Monday → Sunday of the current calendar week
- Days before today are **visually disabled** (blocked in UI)
- Consistent weekly view regardless of current day
- Past days shown but not selectable

**Use Case:**
- Desktop admin views
- Weekly planning
- Seeing full week context

**Example:**
- Today is Tuesday, Jan 16
- Displays: Mon 15 (blocked) → Tue 16 (today) → Wed 17 → ... → Sun 21

**Helper Function:**
```typescript
import { getCalendarWeekDays } from '@/utils/dateTime';

// Get Monday-Sunday for current week
const days = getCalendarWeekDays();
// Returns: ["2024-01-15", "2024-01-16", ..., "2024-01-21"]

// Or for a specific date's week
const specificWeek = getCalendarWeekDays(new Date("2024-01-16"));
```

## Helper Functions

### `getRolling7Days(startDate?)`

Returns 7 consecutive days starting from a given date (or today).

**Parameters:**
- `startDate` (optional): Starting date. Defaults to today in platform timezone

**Returns:** `string[]` - Array of date strings in `YYYY-MM-DD` format

**Example:**
```typescript
// Get today + 6 days
const days = getRolling7Days();

// Get 7 days from a specific date
const customDays = getRolling7Days(new Date("2024-01-20"));
```

**Use Cases:**
- Rolling availability mode
- Booking flow date generation
- Any "starting from today" date range

### `getCalendarWeekDays(date?)`

Returns Monday-Sunday for the week containing the given date.

**Parameters:**
- `date` (optional): Reference date. Defaults to today in platform timezone

**Returns:** `string[]` - Array of 7 date strings from Monday to Sunday

**Example:**
```typescript
// Get current week (Mon-Sun)
const week = getCalendarWeekDays();

// Get the week containing a specific date
const specificWeek = getCalendarWeekDays(new Date("2024-01-17")); // Wednesday
// Returns Monday-Sunday of that week
```

**Use Cases:**
- Calendar week availability mode
- Weekly reports
- Admin weekly planning views

### `isPastDay(dateStr)`

Checks if a given date is before today.

**Parameters:**
- `dateStr`: Date string in `YYYY-MM-DD` format

**Returns:** `boolean` - `true` if date is before today, `false` otherwise

**Example:**
```typescript
isPastDay("2024-01-10"); // true (if today is later)
isPastDay("2024-01-16"); // false (if today is Jan 16)
isPastDay("2024-01-20"); // false (future date)
```

**Use Cases:**
- Filtering past dates
- Validation logic
- Conditional UI rendering

## Timezone Handling

All helper functions are **timezone-aware** using the platform timezone (`PLATFORM_TIMEZONE` from constants).

### Key Points:

1. **Club Timezone Priority:**
   - All date calculations use the club's local timezone
   - Not browser timezone
   - Ensures consistent behavior for all users

2. **UTC Storage:**
   - Backend stores all times in UTC
   - Frontend converts for display
   - See `@/utils/utcDateTime` for UTC-specific utilities

3. **Date String Format:**
   - All functions use `YYYY-MM-DD` format
   - Avoids timezone ambiguity
   - Compatible with HTML input[type="date"]

## Slot Blocking Rules

### Client-Side Blocking (UI)

Implemented via `isSlotBlocked()` in `@/utils/slotBlocking`:

1. **Past Days:** Any day before today is blocked
2. **Past Hours Today:** Slots where `startHour < currentHour` are blocked
3. **Ongoing Slots:** Slots where `startHour === currentHour` are **ALLOWED**
   - Example: 20:00 slot at 20:05 is still bookable
   - Supports late bookings during active slots

### Server-Side Validation

⚠️ **Important:** Backend must independently validate all booking requests. Do not rely on client-side blocking alone.

## API Integration

### Request Parameters

```
GET /api/clubs/{id}/courts/availability
```

**Query Parameters:**
- `start` (optional): Start date in `YYYY-MM-DD` format
- `mode` (optional): `"rolling"` (default) or `"calendar"`
- `days` (optional): Number of days (1-31, default: 7)

**Examples:**
```
# Rolling mode (default) - starts from today
/api/clubs/123/courts/availability

# Calendar mode - shows Mon-Sun of current week
/api/clubs/123/courts/availability?mode=calendar

# Custom start date with rolling mode
/api/clubs/123/courts/availability?start=2024-01-20&mode=rolling

# Custom start with calendar mode
/api/clubs/123/courts/availability?start=2024-01-15&mode=calendar
```

### Response Format

```json
{
  "weekStart": "2024-01-16",
  "weekEnd": "2024-01-22",
  "mode": "rolling",
  "days": [
    {
      "date": "2024-01-16",
      "dayOfWeek": 2,
      "dayName": "Tuesday",
      "isToday": true,
      "hours": [...]
    },
    ...
  ],
  "courts": [...]
}
```

## Frontend Component Usage

### WeeklyAvailabilityTimeline

The main component automatically handles both modes:

```tsx
import { WeeklyAvailabilityTimeline } from '@/components/WeeklyAvailabilityTimeline';

// Default: rolling mode
<WeeklyAvailabilityTimeline clubId="123" />

// Calendar mode
<WeeklyAvailabilityTimeline clubId="123" defaultMode="calendar" />
```

**Auto-Update Behavior:**
- Updates every 60 seconds
- Updates when tab becomes visible
- Ensures "today" is always current

## Testing

### Test Coverage

1. **Helper Functions:** `src/__tests__/dateTime-helpers.test.ts`
   - 20 test cases
   - Edge cases: month/year boundaries
   - Rolling vs Calendar mode differences

2. **API Route:** `src/__tests__/weekly-court-availability.test.ts`
   - 16 test cases
   - Mode parameter handling
   - Date range validation

3. **Slot Blocking:** `src/__tests__/weekly-availability-timeline.test.tsx`
   - 17 test cases
   - Past day/hour blocking
   - Ongoing slot allowance

### Running Tests

```bash
# All weekly availability tests
npm test -- weekly

# Helper function tests only
npm test -- dateTime-helpers

# API tests only
npm test -- weekly-court-availability
```

## Migration Notes

### From Old Implementation

**Before:**
- Default was Monday-based week
- Mixed date calculation logic
- Inconsistent timezone handling

**After:**
- Default is rolling mode (today-based)
- Centralized helper functions
- Consistent timezone usage
- Better test coverage

### Breaking Changes

None - API maintains backward compatibility:
- Still accepts `weekStart` parameter (legacy)
- New `start` parameter preferred
- `mode` defaults to `"rolling"`

## Best Practices

1. **Always use helper functions** instead of manual date calculation
2. **Specify timezone explicitly** when needed (though defaults work for most cases)
3. **Test edge cases**: month end, year end, DST transitions
4. **Server-side validation**: Never trust client-side blocking alone
5. **Use TypeScript types**: Leverage `AvailabilityMode` type for mode parameters

## Related Files

- `/src/utils/dateTime.ts` - Date helper functions
- `/src/utils/slotBlocking.ts` - Slot blocking logic
- `/src/components/WeeklyAvailabilityTimeline.tsx` - Main component
- `/src/app/api/(player)/clubs/[id]/courts/availability/route.ts` - API route
- `/src/__tests__/dateTime-helpers.test.ts` - Helper tests
- `/src/__tests__/weekly-court-availability.test.ts` - API tests
- `/src/__tests__/weekly-availability-timeline.test.tsx` - Component tests

## Future Enhancements

Potential improvements:
- Custom week start day (Sunday vs Monday)
- Configurable business hours per club
- Multi-week views
- Date range presets (next 14 days, etc.)
- Holiday/special date awareness
