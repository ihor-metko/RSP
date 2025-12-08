# Dashboard Mock Mode

This document explains how to use mock mode for the Dashboard page, allowing development without database dependencies.

## Overview

The Dashboard page has three main data endpoints that now support mock mode:
1. **Unified Dashboard** (`/api/admin/unified-dashboard`) - Main dashboard statistics
2. **Registered Users** (`/api/admin/dashboard/registered-users`) - Real user count and trend
3. **Dashboard Graphs** (`/api/admin/dashboard/graphs`) - Booking trends and active users

## Enabling Mock Mode

Set the environment variable to enable mock mode:

```bash
export USE_MOCK_DATA=true
```

Or add it to your `.env.local` file:

```
USE_MOCK_DATA=true
```

## Mock Data Structure

### Mock Users
The mock database includes:
- **1 Root Admin** (user-1): Platform administrator
- **1 Organization Admin** (user-2): Manages org-1
- **1 Club Admin** (user-3): Manages club-3
- **2 Regular Users** (user-4, user-5): Players/customers

### Mock Organizations
- **org-1**: Padel Sports Inc (2 clubs: club-1, club-2)
- **org-2**: Tennis & Padel Corp (1 club: club-3)
- **org-3**: Archived Organization (excluded from counts)

### Mock Clubs
- **club-1**: Downtown Padel Club (3 courts, org-1)
- **club-2**: Suburban Padel Center (2 courts, org-1)
- **club-3**: Elite Padel Academy (2 courts, org-2)

### Mock Bookings
The system includes mix of:
- Past bookings (completed)
- Current/future bookings (active)
- Different statuses: pending, paid, cancelled

## Dashboard Features Supported

### Root Admin Dashboard
When logged in as root admin, the dashboard shows:
- **Total Organizations**: Count of non-archived organizations
- **Total Clubs**: Count of all clubs
- **Total Users**: Count of all users
- **Active Bookings**: Current and future bookings
- **Registered Users Card**: Real users count (excluding admins) with 30-day trend
- **Booking Trends Graph**: Weekly or monthly booking data
- **Active Users Graph**: Unique users who made bookings per day

### Organization Admin Dashboard
When logged in as organization admin, shows metrics for managed organizations:
- Clubs count
- Courts count
- Bookings today
- Club admins count
- Active/upcoming bookings
- Past bookings
- Graphs filtered to organization's data

### Club Admin Dashboard
When logged in as club admin, shows metrics for managed clubs:
- Courts count
- Bookings today
- Active/upcoming bookings
- Past bookings
- Graphs filtered to club's data

## API Response Shapes

### Unified Dashboard Response

**Root Admin:**
```typescript
{
  adminType: "root_admin",
  isRoot: true,
  platformStats: {
    totalOrganizations: number,
    totalClubs: number,
    totalUsers: number,
    activeBookings: number,
    activeBookingsCount: number,
    pastBookingsCount: number
  }
}
```

**Organization Admin:**
```typescript
{
  adminType: "organization_admin",
  isRoot: false,
  organizations: [
    {
      id: string,
      name: string,
      slug: string,
      clubsCount: number,
      courtsCount: number,
      bookingsToday: number,
      clubAdminsCount: number,
      activeBookings: number,
      pastBookings: number
    }
  ]
}
```

**Club Admin:**
```typescript
{
  adminType: "club_admin",
  isRoot: false,
  clubs: [
    {
      id: string,
      name: string,
      slug: string,
      organizationId: string | null,
      organizationName: string | null,
      courtsCount: number,
      bookingsToday: number,
      activeBookings: number,
      pastBookings: number
    }
  ]
}
```

### Registered Users Response
```typescript
{
  totalUsers: number,
  trend: [
    {
      date: string,  // YYYY-MM-DD
      count: number
    }
  ]
}
```

### Dashboard Graphs Response
```typescript
{
  bookingTrends: [
    {
      date: string,      // YYYY-MM-DD
      bookings: number,
      label: string      // "Mon" or "Jan 15"
    }
  ],
  activeUsers: [
    {
      date: string,      // YYYY-MM-DD
      users: number,
      label: string      // "Mon" or "Jan 15"
    }
  ],
  timeRange: "week" | "month"
}
```

## Testing

Run the dashboard mock handler tests:

```bash
npm test -- dashboard-mock-handlers.test.ts
```

This verifies:
- Platform statistics for root admin
- Organization metrics filtering
- Club metrics filtering
- Registered users calculation (excludes admins)
- 30-day trend data generation
- Graph data for week/month views
- Proper date formatting and labels

## Development Workflow

1. **Enable mock mode**:
   ```bash
   export USE_MOCK_DATA=true
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access dashboard**:
   - Navigate to `/admin/dashboard`
   - Login as any mock user
   - Dashboard loads using mock data

4. **Test different admin roles**:
   - Root Admin: See platform-wide statistics
   - Org Admin: See organization-specific metrics
   - Club Admin: See club-specific metrics

## Notes

- Mock data is reset on each server restart
- Trend data uses random values for demonstration
- All dates are generated relative to current date
- Mock mode is intended for development only
- Set `USE_MOCK_DATA=false` or remove the variable to use real database

## Cleanup

When the database is fixed and mock mode is no longer needed:
1. Remove `USE_MOCK_DATA` environment variable
2. Follow instructions in `TODO_MOCK_CLEANUP.md` for full cleanup
