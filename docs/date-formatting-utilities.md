# Date Formatting Utilities

This document describes the centralized date formatting utilities available in `/src/utils/date.ts`.

## Overview

All date formatting across the application should use these centralized utilities to ensure:
- Consistent formatting across the entire application
- Proper i18n support for multiple locales (en, uk)
- Type-safe handling of both string and Date inputs
- Easy maintenance and updates to date formatting logic

## Available Functions

### formatDateShort(date, locale)
Format date in short format (e.g., "Apr 2" in English, "квіт 2" in Ukrainian)
```typescript
formatDateShort('2024-04-02', 'en')  // "Apr 2"
formatDateShort(new Date(), 'uk')     // "квіт 2"
```

### formatDateLong(date, locale)
Format date with full month name and year (e.g., "April 2, 2024")
```typescript
formatDateLong('2024-04-02', 'en')  // "April 2, 2024"
```

### formatDateMedium(date, locale)
Format date with abbreviated month and year (e.g., "Apr 2, 2024")
```typescript
formatDateMedium('2024-04-02', 'en')  // "Apr 2, 2024"
```

### formatDateWithWeekday(date, locale)
Format date with weekday and date (e.g., "Tue, Apr 2")
```typescript
formatDateWithWeekday('2024-04-02', 'en')  // "Tue, Apr 2"
```

### formatDateTime(date, locale)
Format date and time (e.g., "Apr 2, 2024, 14:30")
```typescript
formatDateTime('2024-04-02T14:30:00Z', 'en')  // "Apr 2, 2024, 14:30"
```

### formatDateTimeLong(date, locale)
Format date and time with full month name
```typescript
formatDateTimeLong('2024-04-02T14:30:00Z', 'en')  // "April 2, 2024, 14:30"
```

### formatTime(date, locale)
Format time only (e.g., "14:30")
```typescript
formatTime('2024-04-02T14:30:00Z', 'en')  // "14:30"
```

### formatWeekday(date, locale)
Format weekday name (e.g., "Tuesday")
```typescript
formatWeekday('2024-04-02', 'en')  // "Tuesday"
```

### formatWeekdayShort(date, locale)
Format short weekday name (e.g., "Tue")
```typescript
formatWeekdayShort('2024-04-02', 'en')  // "Tue"
```

### formatDateNoYear(date, locale)
Format date without year (e.g., "Apr 2")
```typescript
formatDateNoYear('2024-04-02', 'en')  // "Apr 2"
```

### formatDateSimple(date, locale)
Format date in simple numeric format (e.g., "4/2/2024")
```typescript
formatDateSimple('2024-04-02', 'en')  // "4/2/2024"
```

## Usage Example in Components

```typescript
import { formatDateShort, formatTime } from '@/utils/date';
import { useCurrentLocale } from '@/hooks/useCurrentLocale';

export function MyComponent() {
  const locale = useCurrentLocale();
  const booking = { start: '2024-04-02T14:30:00Z' };
  
  return (
    <div>
      <p>{formatDateShort(booking.start, locale)}</p>
      <p>{formatTime(booking.start, locale)}</p>
    </div>
  );
}
```

## Migration from Ad-hoc Formatting

### Before (ad-hoc):
```typescript
// ❌ Don't use ad-hoc toLocaleDateString
const date = new Date(dateString);
const formatted = date.toLocaleDateString('en-US', { 
  month: 'short', 
  day: 'numeric' 
});
```

### After (centralized):
```typescript
// ✅ Use centralized utilities
import { formatDateShort } from '@/utils/date';
const formatted = formatDateShort(dateString, locale);
```

## Benefits

1. **Consistency**: All dates are formatted the same way across the app
2. **i18n Support**: Automatically adapts to user's locale
3. **Type Safety**: TypeScript ensures proper usage
4. **Maintainability**: Single source of truth for date formatting
5. **Testing**: Comprehensive test coverage ensures reliability

## Files Already Migrated

- `/src/utils/date.ts` - The centralized utilities
- `/src/utils/bookingFormatters.ts` - Updated to use centralized formatting
- `/src/components/admin/club/ClubSpecialDatesView.tsx`
- `/src/components/admin/NotificationBell.tsx`
- `/src/components/admin/BookingDetailsModal.tsx`
- `/src/components/PersonalizedSection.tsx`
- `/src/app/(pages)/(player)/dashboard/page.tsx`
- `/src/app/(pages)/admin/bookings/page.tsx`

## Remaining Files to Migrate

The following files still use ad-hoc date formatting and should be updated to use the centralized utilities:

### Admin Components
- `src/components/admin/ActivityFeed.tsx`
- `src/components/admin/AdminManagementSection.tsx`
- `src/components/admin/AdminNotifications.tsx`
- `src/components/admin/AdminOrganizationCard.tsx`
- `src/components/admin/ClubAdminsTable.tsx`
- `src/components/admin/OrganizationAdminsTable.tsx`
- `src/components/admin/UserProfileModal.tsx`
- `src/components/admin/PriceRuleForm.tsx`
- `src/components/admin/court/CourtBasicBlock.tsx`
- `src/components/admin/court/CourtMetaBlock.tsx`

### Player/UI Components  
- `src/components/ui/NotificationsDropdown.tsx`
- `src/components/ui/DateInput.tsx`
- `src/components/CourtScheduleModal.tsx`
- `src/components/CourtAvailabilityModal.tsx`
- `src/components/club-operations/BookingDetailModal.tsx`

### Pages
- `src/app/(pages)/admin/users/page.tsx`
- `src/app/(pages)/admin/users/[id]/page.tsx`
- `src/app/(pages)/admin/courts/[courtId]/price-rules/page.tsx`
- `src/app/(pages)/admin/clubs/[id]/page.tsx`
- `src/app/(pages)/(player)/courts/[courtId]/page.tsx`

### API Routes
- `src/app/api/admin/dashboard/graphs/route.ts`
- `src/app/api/admin/dashboard/route.ts`

## Migration Pattern

1. Import the needed formatting functions and `useCurrentLocale`:
   ```typescript
   import { formatDateShort, formatTime } from '@/utils/date';
   import { useCurrentLocale } from '@/hooks/useCurrentLocale';
   ```

2. Get the current locale in your component:
   ```typescript
   const locale = useCurrentLocale();
   ```

3. Replace ad-hoc date formatting calls:
   ```typescript
   // Before: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
   // After: formatDateShort(date, locale)
   ```

4. Test your changes to ensure dates still display correctly.
