# Dashboard Graphs Implementation

## Overview
This document describes the dashboard graphs feature implemented for all admin types in the ArenaOne platform.

## Features

### 1. Graph Types
- **Booking Trends**: Bar chart showing the number of bookings created over time
- **Active Users**: Line chart showing the number of users who logged in per day

### 2. Time Range Options
- **Week**: Shows data for the last 7 days
- **Month**: Shows data for the last 30 days

### 3. Role-Based Data Scoping

#### Root Admin
- Sees all bookings and all active users across the entire platform
- No filtering applied

#### Organization Admin (SuperAdmin/Owner)
- Sees only bookings for clubs within their managed organizations
- Active users include users who have bookings or memberships in their organizations

#### Club Admin
- Sees only bookings for their managed clubs
- Active users include users who have bookings or memberships in their clubs

## Component Structure

```
DashboardGraphs (React Component)
├── Time Range Toggle (Week/Month)
├── Booking Trends Graph (Bar Chart)
│   ├── X-Axis: Date labels
│   ├── Y-Axis: Number of bookings
│   └── Tooltip: Shows date and booking count
└── Active Users Graph (Line Chart)
    ├── X-Axis: Date labels
    ├── Y-Axis: Number of users
    └── Tooltip: Shows date and user count
```

## API Endpoint

### GET /api/admin/dashboard/graphs

**Query Parameters:**
- `timeRange`: `"week"` or `"month"` (default: `"week"`)

**Response:**
```json
{
  "bookingTrends": [
    {
      "date": "2025-12-01",
      "bookings": 15,
      "label": "Mon"
    },
    ...
  ],
  "activeUsers": [
    {
      "date": "2025-12-01",
      "users": 42,
      "label": "Mon"
    },
    ...
  ],
  "timeRange": "week"
}
```

## UI/UX Design

### Dark Theme Integration
- Uses `im-*` semantic CSS classes for consistency
- Color scheme:
  - Primary: `var(--im-primary)` for bookings bar chart
  - Success: `var(--im-success)` for active users line chart
  - Background: `var(--im-bg-secondary)` for cards
  - Text: `var(--im-text-primary)` and `var(--im-text-secondary)`

### Responsive Design
- **Desktop**: 2-column grid layout
- **Tablet/Mobile**: Stacked single-column layout
- Graphs automatically resize to fit container

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus indicators on interactive elements

## Performance Considerations

1. **Efficient Data Fetching**
   - Only fetches necessary date range
   - Uses indexed database fields (createdAt, lastLoginAt)
   - Filters at database level to minimize data transfer

2. **Data Aggregation**
   - Client-side aggregation of bookings by date
   - Map-based counting for O(n) performance

3. **Caching**
   - API responses can be cached by the browser
   - Consider implementing server-side caching for production

## Security

1. **Authorization**
   - Uses `requireAnyAdmin` helper for role-based access control
   - Automatically filters data based on admin context
   - No data leakage between admin scopes

2. **Data Privacy**
   - Active users only show counts, not personal information
   - Root admins and blocked users excluded from active user counts

## Testing

Comprehensive test suite with 9 test cases covering:
- Authentication and authorization
- Role-based data scoping
- Time range handling
- Data aggregation
- Edge cases

All tests pass successfully.

## Future Enhancements

1. **Additional Graph Types**
   - Revenue trends
   - Court utilization rates
   - Peak booking hours

2. **Export Functionality**
   - Download graphs as PNG/PDF
   - Export data as CSV

3. **Comparison Views**
   - Compare current period with previous period
   - Year-over-year comparisons

4. **Real-time Updates**
   - WebSocket integration for live data
   - Auto-refresh on interval

5. **Drill-down Capabilities**
   - Click on data points to see detailed breakdowns
   - Filter by club, court, or date range
