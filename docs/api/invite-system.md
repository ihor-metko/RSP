# Invite System API Documentation

The invite system provides a secure, unified way to invite users to organizations and clubs with specific roles.

## Overview

- **Base Path**: `/api/invites`
- **Authentication**: Required for create and accept endpoints; not required for validate endpoint
- **Authorization**: Role-based permissions enforced on create endpoint

## Key Features

- **Secure token generation**: 256-bit random tokens, URL-safe base64 encoded
- **Token hashing**: SHA-256 hashing with constant-time comparison to prevent timing attacks
- **Owner uniqueness**: Enforces single owner per organization/club
- **Duplicate prevention**: One active invite per (email + scope)
- **Transaction safety**: Accept endpoint uses database transactions
- **Expiration**: 7-day default expiration period

## Endpoints

### 1. Create Invite

Create a new invite to assign a role within an organization or club.

**Endpoint**: `POST /api/invites`

**Authentication**: Required

**Request Body**:

```json
{
  "email": "user@example.com",
  "role": "ORGANIZATION_ADMIN",
  "organizationId": "org-123"
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address of the person to invite (will be normalized to lowercase) |
| `role` | InviteRole | Yes | Role to assign: `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `CLUB_OWNER`, or `CLUB_ADMIN` |
| `organizationId` | string | Conditional | Required for organization roles (`ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`) |
| `clubId` | string | Conditional | Required for club roles (`CLUB_OWNER`, `CLUB_ADMIN`) |

**Role Permissions**:

| Role | Who Can Invite | Notes |
|------|----------------|-------|
| `ORGANIZATION_OWNER` | Root Admin, Organization Owner | Only one owner per organization |
| `ORGANIZATION_ADMIN` | Root Admin, Organization Admin | Multiple admins allowed |
| `CLUB_OWNER` | Root Admin | Only one owner per club |
| `CLUB_ADMIN` | Root Admin, Organization Admin, Club Owner | Multiple admins allowed |

**Success Response** (201 Created):

```json
{
  "success": true,
  "invite": {
    "id": "invite-123",
    "email": "user@example.com",
    "role": "ORGANIZATION_ADMIN",
    "organizationId": "org-123",
    "clubId": null,
    "status": "PENDING",
    "expiresAt": "2025-01-03T10:00:00.000Z",
    "createdAt": "2024-12-27T10:00:00.000Z",
    "token": "a1b2c3d4e5f6..." // ⚠️ ONLY returned on creation, never again
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Email is required` | Missing email field |
| 400 | `Invalid email format` | Email format validation failed |
| 400 | `Role must be one of: ...` | Invalid role value |
| 400 | `Organization ID is required` | Missing organizationId for org role |
| 400 | `Club ID is required` | Missing clubId for club role |
| 401 | `Unauthorized` | User not authenticated |
| 403 | `Forbidden` | User lacks permission to create invite |
| 409 | `Organization already has an owner` | Owner uniqueness constraint violated |
| 409 | `Club already has an owner` | Owner uniqueness constraint violated |
| 409 | `An active invite already exists` | Duplicate invite prevention |

**Example Requests**:

```bash
# Invite organization admin
curl -X POST http://localhost:3000/api/invites \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "role": "ORGANIZATION_ADMIN",
    "organizationId": "org-123"
  }'

# Invite club admin
curl -X POST http://localhost:3000/api/invites \
  -H "Content-Type: application/json" \
  -d '{
    "email": "clubadmin@example.com",
    "role": "CLUB_ADMIN",
    "clubId": "club-456"
  }'
```

---

### 2. Validate Invite

Validate an invite token without accepting it. Returns invite metadata if valid.

**Endpoint**: `GET /api/invites/validate`

**Authentication**: Not required (public endpoint)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The invite token to validate |

**Success Response** (200 OK):

```json
{
  "valid": true,
  "invite": {
    "id": "invite-123",
    "email": "user@example.com",
    "role": "ORGANIZATION_ADMIN",
    "organizationId": "org-123",
    "organization": {
      "id": "org-123",
      "name": "Example Organization"
    },
    "clubId": null,
    "club": null,
    "expiresAt": "2025-01-03T10:00:00.000Z",
    "createdAt": "2024-12-27T10:00:00.000Z"
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Token is required` | Missing token query parameter |
| 404 | `Invalid invite token` | Token not found or invalid |
| 410 | `This invite has already been accepted` | Invite was already used |
| 410 | `This invite has been revoked` | Invite was revoked by admin |
| 410 | `This invite has expired` | Invite expiration date passed |

**Example Request**:

```bash
curl http://localhost:3000/api/invites/validate?token=a1b2c3d4e5f6...
```

---

### 3. Accept Invite

Accept an invite and create the appropriate membership. Must be called by authenticated user.

**Endpoint**: `POST /api/invites/accept`

**Authentication**: Required

**Request Body**:

```json
{
  "token": "a1b2c3d4e5f6..."
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | The invite token to accept |

**Success Response** (200 OK):

```json
{
  "success": true,
  "message": "Invite accepted successfully",
  "membership": {
    "id": "membership-123",
    "role": "ORGANIZATION_ADMIN",
    "type": "organization"
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Token is required` | Missing token in request body |
| 401 | `Unauthorized` | User not authenticated |
| 403 | `This invite is for a different email address` | User's email doesn't match invite |
| 404 | `Invalid invite token` | Token not found or invalid |
| 409 | `You are already a member` | User already has membership for this scope |
| 410 | `This invite has already been accepted` | Invite was already used |
| 410 | `This invite has been revoked` | Invite was revoked by admin |
| 410 | `This invite has expired` | Invite expiration date passed |

**Example Request**:

```bash
curl -X POST http://localhost:3000/api/invites/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6..."
  }'
```

---

## Role Mapping

The invite system uses `InviteRole` enum values that map to the underlying membership roles:

| Invite Role | Membership Table | Membership Role | isPrimaryOwner |
|-------------|------------------|-----------------|----------------|
| `ORGANIZATION_OWNER` | Membership | `ORGANIZATION_ADMIN` | `true` |
| `ORGANIZATION_ADMIN` | Membership | `ORGANIZATION_ADMIN` | `false` |
| `CLUB_OWNER` | ClubMembership | `CLUB_OWNER` | N/A |
| `CLUB_ADMIN` | ClubMembership | `CLUB_ADMIN` | N/A |

---

## Business Rules

### Owner Uniqueness

1. **Organization Owner**: Only one user can have `isPrimaryOwner: true` per organization
2. **Club Owner**: Only one user can have `CLUB_OWNER` role per club
3. Attempting to create an invite for an owner role when one already exists returns `409 Conflict`

### Invite Scope

1. An invite belongs to **either** an organization **or** a club, never both
2. Organization-level invites require `organizationId`
3. Club-level invites require `clubId`
4. Providing both `organizationId` and `clubId` returns `400 Bad Request`

### Duplicate Prevention

1. Only one `PENDING` invite per (email + scope) is allowed
2. Creating a duplicate returns `409 Conflict` with the existing invite ID
3. After acceptance, revocation, or expiration, new invites can be created for the same email/scope

### Email Matching

1. When accepting an invite, the authenticated user's email must match the invite email (case-insensitive)
2. This prevents invite hijacking and ensures the right person accepts the invite

---

## Security Considerations

### Token Security

1. **Generation**: 256-bit cryptographically secure random tokens
2. **Storage**: Only SHA-256 hash stored in database, never raw token
3. **Comparison**: Constant-time comparison prevents timing attacks
4. **Single-use**: Token returned only on creation, never retrievable again
5. **Expiration**: Tokens expire after 7 days by default

### Permission Enforcement

1. **Create**: Validates inviter has permission for the role/scope
2. **Accept**: Validates user email matches invite email
3. **Validate**: Public endpoint but doesn't expose sensitive data

### Transaction Safety

1. Accept endpoint wraps membership creation + invite update in database transaction
2. Ensures atomicity - either both succeed or both fail
3. Prevents race conditions and partial state

---

## Common Workflows

### Invite Organization Admin

1. Organization admin/owner calls `POST /api/invites` with role `ORGANIZATION_ADMIN`
2. System validates permissions and creates invite
3. System returns invite with token
4. Inviter sends token to invitee (email, link, etc.)
5. Invitee validates token with `GET /api/invites/validate?token=...`
6. Invitee signs up/logs in and calls `POST /api/invites/accept`
7. System creates `Membership` record and marks invite as accepted

### Invite Club Owner (Root Admin Only)

1. Root admin calls `POST /api/invites` with role `CLUB_OWNER`
2. System validates no existing owner and creates invite
3. Invitee accepts as above
4. System creates `ClubMembership` with `CLUB_OWNER` role

### Handle Expired Invite

1. User tries to validate/accept expired invite
2. System returns `410 Gone` with "expired" error
3. Admin must create new invite for the user

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Additional context may be included for specific errors (e.g., `existingInviteId` for duplicates).

---

## Future Enhancements (Out of Scope)

- ❌ Email templates and sending
- ❌ UI components for invite management
- ❌ Invite revocation endpoint
- ❌ Invite listing/management endpoints
- ❌ Player self-invites
- ❌ Invite expiration customization per invite
