# Organization Management Mock Mode

This document explains how to use mock mode for Organization Management endpoints, allowing development and testing without database dependencies.

## Overview

The Organization Management mock system provides realistic endpoint behavior for:
1. **Create Organization** (`POST /api/admin/organizations`) - Create new organizations
2. **Update Organization** (`PATCH /api/admin/organizations/[id]` and `PUT /api/orgs/[orgId]`) - Update org details
3. **Archive Organization** (`POST /api/orgs/[orgId]/archive`) - Soft-delete organizations
4. **Restore Organization** (`POST /api/orgs/[orgId]/restore`) - Restore archived organizations (NEW)
5. **Delete Organization** (`DELETE /api/admin/organizations/[id]`) - Hard delete with confirmation
6. **Reassign Owner** (`POST /api/orgs/[orgId]/reassign-superadmin`) - Change primary owner

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

### Initial Mock Organizations
The mock database starts with:
- **org-1**: Padel Sports Inc (has 2 clubs, active)
- **org-2**: Tennis & Padel Corp (has 1 club, active)
- **org-3**: Archived Organization (archived, for testing restore)

### Organization Fields
```typescript
{
  id: string;              // UUID
  name: string;            // Organization name
  slug: string;            // URL-friendly unique slug
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  metadata: object | null; // JSON object for additional data
  supportedSports: string[]; // e.g., ["PADEL", "TENNIS"]
  createdById: string;     // User ID who created it
  archivedAt: Date | null; // Null if active
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoint Behaviors

### 1. Create Organization

**Endpoint:** `POST /api/admin/organizations`

**Authorization:** Root admin only

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-org",           // Optional, auto-generated from name
  "supportedSports": ["PADEL"] // Optional, defaults to ["PADEL"]
}
```

**Success Response (201):**
```json
{
  "id": "org-123",
  "name": "New Organization",
  "slug": "new-org",
  "createdAt": "2024-12-10T20:00:00Z",
  "clubCount": 0,
  "createdBy": {
    "id": "user-1",
    "name": "Root Admin",
    "email": "root@example.com"
  },
  "superAdmin": null,
  "supportedSports": ["PADEL"]
}
```

**Validation:**
- Name is required (400 if missing/empty)
- Slug must be unique (409 if duplicate)
- Slug auto-generated from name if not provided

---

### 2. Update Organization (Admin)

**Endpoint:** `PATCH /api/admin/organizations/[id]`

**Authorization:** Root admin only

**Request Body:**
```json
{
  "name": "Updated Name",      // Optional
  "slug": "updated-slug",      // Optional
  "supportedSports": ["PADEL", "TENNIS"] // Optional
}
```

**Success Response (200):**
```json
{
  "id": "org-123",
  "name": "Updated Name",
  "slug": "updated-slug",
  "createdAt": "2024-12-10T20:00:00Z",
  "updatedAt": "2024-12-10T20:05:00Z",
  "clubCount": 2,
  "createdBy": { ... },
  "superAdmins": [...],
  "superAdmin": { ... },
  "supportedSports": ["PADEL", "TENNIS"]
}
```

**Validation:**
- Organization must exist (404 if not found)
- Cannot update archived organization (400)
- Name cannot be empty (400)
- Slug must be unique (409 if conflicts with another org)

---

### 3. Update Organization (Detail)

**Endpoint:** `PUT /api/orgs/[orgId]`

**Authorization:** Root admin or Organization admin

**Request Body:**
```json
{
  "name": "New Name",
  "slug": "new-slug",
  "contactEmail": "contact@example.com",
  "contactPhone": "+1234567890",
  "website": "https://example.com",
  "address": "123 Main St",
  "metadata": { "key": "value" }
}
```

**Success Response (200):**
```json
{
  "id": "org-123",
  "name": "New Name",
  "slug": "new-slug",
  "contactEmail": "contact@example.com",
  "contactPhone": "+1234567890",
  "website": "https://example.com",
  "address": "123 Main St",
  "metadata": { "key": "value" },
  "archivedAt": null,
  "createdAt": "2024-12-10T20:00:00Z",
  "updatedAt": "2024-12-10T20:05:00Z",
  "createdBy": { ... },
  "clubCount": 2
}
```

---

### 4. Archive Organization

**Endpoint:** `POST /api/orgs/[orgId]/archive`

**Authorization:** Root admin or Organization admin

**Request Body:** Empty

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organization archived successfully",
  "organization": {
    "id": "org-123",
    "name": "Organization Name",
    "slug": "org-slug",
    "archivedAt": "2024-12-10T20:10:00Z",
    "createdAt": "2024-12-10T20:00:00Z",
    "clubCount": 2
  }
}
```

**Validation:**
- Organization must exist (404)
- Cannot archive already archived organization (400)

---

### 5. Restore Organization (NEW)

**Endpoint:** `POST /api/orgs/[orgId]/restore`

**Authorization:** Root admin or Organization admin

**Request Body:** Empty

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organization restored successfully",
  "organization": {
    "id": "org-123",
    "name": "Organization Name",
    "slug": "org-slug",
    "archivedAt": null,
    "createdAt": "2024-12-10T20:00:00Z",
    "clubCount": 2
  }
}
```

**Validation:**
- Organization must exist (404)
- Organization must be archived (400 if not)

---

### 6. Delete Organization

**Endpoint:** `DELETE /api/admin/organizations/[id]`

**Authorization:** Root admin only

**Request Body (when organization has clubs):**
```json
{
  "confirmOrgSlug": "org-slug"  // Must match organization slug
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

**Requires Confirmation Response (409):**
```json
{
  "error": "Cannot delete organization with active clubs",
  "clubCount": 3,
  "requiresConfirmation": true,
  "hint": "Provide confirmOrgSlug matching the organization slug to confirm deletion"
}
```

**Validation:**
- Organization must exist (404)
- Requires confirmation if organization has clubs (409)
- Requires confirmation if organization has active bookings (409)
- Deletes all associated memberships

---

### 7. Reassign Organization Owner

**Endpoint:** `POST /api/orgs/[orgId]/reassign-superadmin`

**Authorization:** Root admin only

**Request Body (existing user):**
```json
{
  "userId": "user-456"
}
```

**Request Body (create new user):**
```json
{
  "email": "newowner@example.com",
  "name": "New Owner"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Primary owner reassigned successfully",
  "previousOwner": {
    "id": "user-123",
    "name": "Old Owner",
    "email": "oldowner@example.com"
  },
  "newOwner": {
    "id": "user-456",
    "name": "New Owner",
    "email": "newowner@example.com"
  },
  "isNewUser": false
}
```

**Validation:**
- Organization must exist (404)
- Cannot modify archived organization (400)
- Either userId or email is required (400)
- Name is required when creating new user (400)
- User must exist if userId provided (404)

---

## Error Simulation

You can simulate various error conditions for testing by editing `/mocks/config/org-management-mock.json`:

```json
{
  "mode": "normal",
  "latencyMs": 100,
  "errorSimulation": {
    "create": {
      "enabled": true,
      "errorType": "duplicate_slug",
      "statusCode": 409,
      "message": "Simulated slug conflict"
    }
  }
}
```

### Available Error Types

1. **none** - No error simulation (normal operation)
2. **duplicate_slug** - Simulate slug conflict (409)
3. **validation_error** - Simulate validation failure (400/422)
4. **permission_error** - Simulate permission denied (403)
5. **server_error** - Simulate internal server error (500)
6. **timeout** - Simulate request timeout
7. **conflict** - Simulate resource conflict (409)
8. **not_found** - Simulate resource not found (404)

### Error Simulation Examples

**Test duplicate slug on create:**
```json
{
  "errorSimulation": {
    "create": {
      "enabled": true,
      "errorType": "duplicate_slug",
      "statusCode": 409,
      "message": "An organization with this slug already exists"
    }
  }
}
```

**Test permission error on delete:**
```json
{
  "errorSimulation": {
    "delete": {
      "enabled": true,
      "errorType": "permission_error",
      "statusCode": 403,
      "message": "You do not have permission to delete this organization"
    }
  }
}
```

**Add artificial latency:**
```json
{
  "latencyMs": 2000  // 2 second delay on all mock operations
}
```

## Audit Log Simulation

All organization management operations create mock audit log entries:

- `org.create` - Organization created
- `org.update` - Organization updated
- `org.archive` - Organization archived
- `org.restore` - Organization restored
- `org.delete` - Organization deleted
- `org.reassign_owner` - Primary owner reassigned

Audit logs can be viewed via the mock API:
```typescript
import { getMockAuditLogs } from "@/services/mockDb";
const logs = getMockAuditLogs();
```

## Side Effects & State Management

The mock system maintains consistent state:

1. **Create** - Adds new organization to mock store
2. **Update** - Modifies existing organization in-place
3. **Archive** - Sets `archivedAt` timestamp
4. **Restore** - Clears `archivedAt` timestamp
5. **Delete** - Removes organization and all memberships
6. **Reassign Owner** - Updates membership records, removes `isPrimaryOwner` from old owner

Subsequent GET requests will reflect these changes.

## Testing

### Run Mock Tests

```bash
npm test -- org-management-mock.test.ts
```

This runs 29 comprehensive tests covering:
- CRUD operations
- Validation scenarios
- Error handling
- Audit log generation
- Membership management

### Manual QA Checklist

- [ ] Create organization with valid data
- [ ] Create organization with duplicate slug (should fail)
- [ ] Create organization with empty name (should fail)
- [ ] Update organization name and slug
- [ ] Update organization with duplicate slug (should fail)
- [ ] Update archived organization (should fail)
- [ ] Archive active organization
- [ ] Archive already archived organization (should fail)
- [ ] Restore archived organization
- [ ] Restore active organization (should fail)
- [ ] Delete organization without clubs
- [ ] Delete organization with clubs (should require confirmation)
- [ ] Delete organization with confirmation
- [ ] Reassign owner to existing user
- [ ] Reassign owner by creating new user
- [ ] Reassign owner without userId or email (should fail)
- [ ] Check audit logs are created for each operation

## Development Workflow

1. **Enable mock mode:**
   ```bash
   export USE_MOCK_DATA=true
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Test organization management:**
   - Navigate to `/admin/organizations`
   - Create, update, archive, restore, delete organizations
   - Reassign owners
   - Check audit logs

4. **Test error scenarios:**
   - Edit `/mocks/config/org-management-mock.json`
   - Enable error simulation for specific operations
   - Verify UI handles errors gracefully

5. **Disable mock mode:**
   ```bash
   unset USE_MOCK_DATA
   # or
   export USE_MOCK_DATA=false
   ```

## Production Safety

### Environment Guards

All mock code is guarded by `USE_MOCK_DATA` environment variable checks:

```typescript
if (isMockMode()) {
  // Mock handler
}
// Real database code
```

### Next.js Build Configuration

Mock mode is disabled in production builds automatically through Next.js environment configuration in `next.config.ts`:

```typescript
env: {
  USE_MOCK_DATA: process.env.USE_MOCK_DATA || "false",
}
```

### Removal Checklist

When the database is fixed and mocks are no longer needed:

1. Remove `USE_MOCK_DATA` environment variable
2. Follow instructions in `TODO_MOCK_CLEANUP.md`
3. Remove mock integration code from API routes
4. Remove `/mocks` directory
5. Remove mock-related imports from endpoints

## Notes

- Mock data is reset on server restart
- All dates are relative to current time
- Mock mode is intended for development only
- Performance simulation via `latencyMs` config
- No real database queries are made in mock mode
- State changes persist during the session

## Troubleshooting

**Mock mode not working:**
- Verify `USE_MOCK_DATA=true` is set
- Check console for mock mode initialization logs
- Restart dev server after changing env variable

**Tests failing:**
- Run `npm install` to ensure dependencies are installed
- Check that mock data initialization is correct
- Verify audit log and membership helpers are working

**Error simulation not working:**
- Check `/mocks/config/org-management-mock.json` syntax
- Ensure `enabled: true` for the operation
- Verify `errorType` is one of the valid types
- Restart server after changing config file

## Related Documentation

- [Dashboard Mock Mode](./mock-mode-dashboard.md)
- [Mock Cleanup Guide](../TODO_MOCK_CLEANUP.md)
- [API Documentation](../API.md)
