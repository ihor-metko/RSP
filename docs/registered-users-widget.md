# Registered Users Widget - Implementation Documentation

## Overview

The Registered Users widget displays the count of real, active platform users (players) on the Root Admin Dashboard, excluding system/test/admin accounts. It includes a 30-day trend visualization showing user registration activity.

## Features

### Data Filtering

The widget displays only real players by excluding:
- **Root Admins**: Users with `isRoot = true`
- **Organization Admins**: Users with `ORGANIZATION_ADMIN` role in the Membership table
- **Club Admins**: Users with `CLUB_ADMIN` role in the ClubMembership table

The filtering is performed **server-side** to ensure accuracy and security.

### Metrics

- **Total Users**: The total count of registered users after filtering out all admin accounts
- **30-Day Trend**: A sparkline visualization showing daily user registrations for the last 30 days

### Access Control

- Only **Root Admin** users can access this data
- Other admin types (Organization Admin, Club Admin) will not see this widget
- Enforced using the `requireRootAdmin` helper from `@/lib/requireRole`

## Technical Implementation

### Backend API

**Endpoint**: `GET /api/admin/dashboard/registered-users`

**Location**: `/src/app/api/admin/dashboard/registered-users/route.ts`

**Response Format**:
```json
{
  "totalUsers": 1234,
  "trend": [
    { "date": "2025-12-01", "count": 20 },
    { "date": "2025-12-02", "count": 15 },
    ...
  ]
}
```

**Implementation Details**:
- Fetches all admin user IDs from three sources (root admins, org admins, club admins)
- Deduplicates admin IDs (users can have multiple admin roles)
- Counts users excluding the admin IDs
- Retrieves users created in the last 30 days (excluding admins)
- Groups users by date using a Map for O(n) time complexity
- Builds a 30-day trend array with daily counts

**Performance Optimization**:
- Uses Promise.all for parallel database queries
- Optimized trend calculation from O(n*30) to O(n) using Map-based grouping
- Minimal data retrieval (only `createdAt` field for trend calculation)

### Frontend Component

**Component**: `RegisteredUsersCard`

**Location**: `/src/components/admin/RegisteredUsersCard.tsx`

**Features**:
- Fetches data from the API endpoint on mount
- Displays loading state with spinner
- Shows error state if fetch fails
- Renders total user count prominently
- Includes SVG-based sparkline visualization for 30-day trend
- Fully internationalized (English and Ukrainian)
- Styled with dark theme support using `im-*` classes

**Styling**:
- Location: `/src/components/admin/RegisteredUsersCard.css`
- Uses CSS variables for theming
- Responsive design with mobile optimizations
- Follows the existing design system (`im-*` classes)
- Green color scheme for users metric

### Integration

The `RegisteredUsersCard` is integrated into the Root Admin Dashboard page:

**Location**: `/src/app/(pages)/admin/dashboard/page.tsx`

**Placement**: 
- Displayed below the main statistics grid (Organizations, Clubs, Total Users, Active Bookings)
- Only shown when `adminType === "root_admin"`
- Full-width card in its own grid row

## Testing

### Backend Tests

**Location**: `/src/__tests__/registered-users-api.test.ts`

**Coverage** (11 tests):
- ✅ Authentication and authorization checks
- ✅ Filtering logic for root admins
- ✅ Filtering logic for organization admins
- ✅ Filtering logic for club admins
- ✅ Edge case: zero users when only admins exist
- ✅ Edge case: zero users when no users exist
- ✅ 30-day trend data structure and format
- ✅ Error handling for database failures
- ✅ Deduplication of admin IDs (users with multiple admin roles)

### Frontend Tests

**Location**: `/src/__tests__/registered-users-card.test.tsx`

**Coverage** (8 tests):
- ✅ Loading state rendering
- ✅ Data display with formatted numbers
- ✅ Error state handling
- ✅ Network error handling
- ✅ Zero users display
- ✅ API endpoint verification
- ✅ Custom className support
- ✅ Sparkline rendering with correct data points

## Translations

### English (en.json)
```json
{
  "rootAdmin": {
    "dashboard": {
      "registeredUsers": "Registered Users",
      "registeredUsersDescription": "Real, active platform users (excluding admins)",
      "trendLabel": "Last 30 days activity",
      "failedToLoadRegisteredUsers": "Failed to load registered users data. Please try again later."
    }
  }
}
```

### Ukrainian (uk.json)
```json
{
  "rootAdmin": {
    "dashboard": {
      "registeredUsers": "Зареєстровані користувачі",
      "registeredUsersDescription": "Реальні, активні користувачі платформи (без адміністраторів)",
      "trendLabel": "Активність за останні 30 днів",
      "failedToLoadRegisteredUsers": "Не вдалося завантажити дані користувачів. Спробуйте пізніше."
    }
  }
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Additional Filters**:
   - Option to filter by email verification status
   - Option to filter users with at least one booking
   - Option to exclude test users (if `isTestUser` field is added to schema)

2. **Extended Trend Options**:
   - Toggle between 7-day and 30-day views
   - Month-over-month comparison
   - Year-over-year growth metrics

3. **Enhanced Visualizations**:
   - More detailed chart with hover tooltips
   - Growth percentage indicators
   - User segments breakdown (verified vs unverified, active vs inactive)

4. **Export Capabilities**:
   - Export user data to CSV
   - Generate reports

## Security Considerations

- ✅ All filtering is performed server-side
- ✅ Access restricted to Root Admin only
- ✅ No sensitive user data exposed in the API response
- ✅ Proper error handling without exposing internal details
- ✅ No SQL injection vulnerabilities (using Prisma ORM)
- ✅ CodeQL security scan passed with no alerts

## Performance Considerations

- ✅ Database queries are optimized using Promise.all for parallelization
- ✅ Trend calculation uses O(n) time complexity with Map-based grouping
- ✅ Minimal data retrieval (only necessary fields)
- ✅ Frontend component uses React hooks efficiently
- ✅ No unnecessary re-renders

## Maintenance Notes

### Database Schema Dependencies

The implementation relies on:
- `User.isRoot` field
- `Membership.role` field (with `ORGANIZATION_ADMIN` enum value)
- `ClubMembership.role` field (with `CLUB_ADMIN` enum value)
- `User.createdAt` field

### API Contract

The endpoint response format is exported as `RegisteredUsersResponse` type, ensuring type safety between backend and frontend.

### Testing

Run tests with:
```bash
# Backend tests
npm test -- registered-users-api.test.ts

# Frontend tests
npm test -- registered-users-card.test.tsx

# All tests
npm test
```

### Building

Build the project with:
```bash
npm run build
```

### Linting

Check code quality with:
```bash
npm run lint
```
