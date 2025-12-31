# Organization Data Fetching Refactor

## Overview
This document describes the refactoring of organization data fetching to establish a single source of truth and reduce unnecessary API calls.

## Problem
- Organization data was fetched multiple times on page reload
- Sidebar fetched full organization details (~10KB) when only needing the name
- Unclear ownership of organization data across components
- Performance impact from redundant requests

## Solution

### 1. Lightweight Summary Endpoint
**Endpoint**: `GET /api/admin/organizations/:id/summary`

**Response**:
```json
{
  "id": "org-123",
  "name": "Example Organization",
  "slug": "example-org"
}
```

**Use Case**: Layout components (sidebar, header, breadcrumbs)

### 2. Data Ownership Pattern

#### Layout Data
- **Endpoint**: `/api/admin/organizations/:id/summary`
- **Owner**: `AdminSidebar.tsx`
- **Store Method**: `useOrganizationStore.ensureOrganizationSummary()`
- **Cache**: `useOrganizationStore.organizationSummariesById`

#### Full Organization Details
- **Endpoint**: `/api/admin/organizations/:id`
- **Owner**: Organization detail page
- **Store Method**: `useOrganizationStore.ensureOrganizationById()`
- **Cache**: `useOrganizationStore.organizationsById`

## Usage

### Fetching Organization Summary (for layout)
```typescript
import { useOrganizationStore } from '@/stores/useOrganizationStore';

// In a component
const ensureOrganizationSummary = useOrganizationStore(
  state => state.ensureOrganizationSummary
);
const summary = useOrganizationStore(
  state => state.getOrganizationSummaryById(orgId)
);

// Fetch if needed
useEffect(() => {
  ensureOrganizationSummary(orgId);
}, [orgId, ensureOrganizationSummary]);

// Use the summary
console.log(summary?.name); // Organization name
```

### Fetching Full Organization Details (for detail pages)
```typescript
import { useOrganizationStore } from '@/stores/useOrganizationStore';

// In a component
const ensureOrganizationById = useOrganizationStore(
  state => state.ensureOrganizationById
);
const org = useOrganizationStore(
  state => state.getOrganizationDetailById(orgId)
);

// Fetch if needed
useEffect(() => {
  ensureOrganizationById(orgId);
}, [orgId, ensureOrganizationById]);

// Use the full details
console.log(org?.metrics); // Organization metrics
console.log(org?.clubsPreview); // Clubs preview
```

## Benefits

### Performance
- ~99% reduction in layout request payload size
- Reduced server load (fewer database joins)
- Faster initial page load

### Architecture
- Clear data ownership
- Single source of truth per use case
- Separate caching for layout vs details
- No duplicate fetches

### Maintainability
- Clear data flow
- Easy to understand which component fetches what
- Inflight guards prevent race conditions

## Testing
- 4 API tests for summary endpoint
- 9 store tests for summary methods
- All tests passing (47/47)

## Migration Guide

### Before
```typescript
// Sidebar was fetching full details
const fetchOrganizationById = useOrganizationStore(
  state => state.fetchOrganizationById
);
useEffect(() => {
  fetchOrganizationById(orgId);
}, [orgId]);
```

### After
```typescript
// Sidebar now fetches summary
const ensureOrganizationSummary = useOrganizationStore(
  state => state.ensureOrganizationSummary
);
useEffect(() => {
  ensureOrganizationSummary(orgId);
}, [orgId, ensureOrganizationSummary]);
```

## Future Enhancements
1. Add organization logo to summary for avatar display
2. Extend pattern to club summaries
3. Add summary endpoints for other heavy resources
4. Implement cache invalidation strategies
