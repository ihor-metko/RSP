# Admin Dashboard Components

This document describes the refactored Admin Dashboard components and their architecture.

## Overview

The Admin Dashboard has been refactored into a set of modular, reusable components that follow best practices for data management, accessibility, and responsive design.

## New Components

### 1. DashboardShell
Layout wrapper for consistent dashboard structure.

### 2. QuickActions
Role-based quick action shortcuts (Create Club, Invite Admin, Create Court).

### 3. ClubsPreview
Preview of clubs with key metrics and pagination.

### 4. AdminsPanel
Admin counts with management links.

### 5. ActivityFeed
Recent audit events timeline (ready for audit integration).

## Dashboard Service

**Location**: `src/services/dashboard.ts`

Centralized service for data fetching:
- `fetchUnifiedDashboard()` - Fetches role-appropriate dashboard data
- `aggregateOrgMetrics()` - Aggregates organization metrics
- `aggregateClubMetrics()` - Aggregates club metrics

## Testing

All components have comprehensive unit tests (21 tests total).

Run tests:
```bash
npm test -- --testPathPatterns="quick-actions|clubs-preview|admins-panel"
```

## Internationalization

All components support English and Ukrainian via `next-intl`.

Translation keys added to `locales/en.json` and `locales/uk.json`.

## Styling

All components use `im-*` semantic classes and support the dark theme.

## Related Documentation

- Dashboard Graphs UI
- Registered Users Widget
- Organizations Card Layout
