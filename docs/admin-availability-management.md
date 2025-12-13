# Admin Availability Management

This document describes the admin availability management feature for the WeeklyAvailabilityTimeline component.

## Overview

Admins (Root Admin, Organization Admin, Club Admin) can now create, edit, and delete court availability blocks directly from the WeeklyAvailabilityTimeline UI. This allows for manual management of court availability beyond the automatic booking-based availability.

## Features

### Role-Based Access Control

- **Root Admin**: Can edit availability for any club
- **Organization Admin**: Can edit availability for clubs within their organization
- **Club Admin**: Can edit availability for their specific assigned clubs

### UI Components

1. **Edit Mode Toggle**
   - Appears at the top of the WeeklyAvailabilityTimeline component
   - Only visible to users with edit permissions (`canEdit: true` from API)
   - Switches between view mode and edit mode

2. **Edit Action Bar**
   - Displays when in edit mode
   - Shows count of pending changes
   - Contains "Save Changes" and "Cancel" buttons

3. **Availability Block Modal**
   - Opens when clicking on a time slot in edit mode
   - Allows adding new availability blocks
   - Displays existing blocks for that hour
   - Enables removing blocks with confirmation

### Functionality

#### Adding Availability Blocks

1. Click "Edit Availability" button
2. Click on any time slot in the timeline
3. In the modal, select:
   - Court
   - Start time
   - End time
   - Reason (optional)
4. Click "Add Block"
5. Click "Save Changes" to persist

#### Removing Availability Blocks

1. Enter edit mode
2. Click on a time slot that has blocks
3. In the modal, click "Remove" next to the block you want to delete
4. Click "Save Changes" to persist

#### Saving Changes

All changes are collected locally until you click "Save Changes":
- New blocks are marked with `action: "create"`
- Deleted blocks are marked with `action: "delete"`
- Changes are sent in a single bulk API request
- API validates permissions and checks for conflicts
- Success/error toast notifications are shown

### Conflict Handling

The API checks for conflicts with existing bookings:
- If a block overlaps with confirmed bookings, the API returns 409 status
- UI displays error message with conflict details
- No changes are applied if conflicts are detected
- Admins must resolve conflicts manually (e.g., by adjusting block times)

## API Endpoints

### GET `/api/clubs/[id]/courts/availability`

Returns availability data with permission information:

```json
{
  "weekStart": "2024-12-02",
  "weekEnd": "2024-12-08",
  "days": [...],
  "courts": [...],
  "mode": "rolling",
  "canEdit": true,
  "allowedClubs": ["club-id-1", "club-id-2"]
}
```

### POST `/api/availability/bulk`

Bulk create/update/delete availability blocks:

**Request:**
```json
{
  "clubId": "club-id",
  "changes": {
    "created": [
      {
        "courtId": "court-id",
        "date": "2024-12-06",
        "startTime": "10:00",
        "endTime": "12:00",
        "reason": "Maintenance"
      }
    ],
    "updated": [],
    "deleted": ["block-id-1", "block-id-2"]
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "result": {
    "created": [...],
    "updated": [...],
    "deleted": [...]
  }
}
```

**Response (Conflict):**
```json
{
  "error": "Conflicts with existing bookings",
  "conflicts": [
    {
      "courtId": "court-id",
      "date": "2024-12-06",
      "startTime": "10:00",
      "endTime": "12:00",
      "bookingIds": ["booking-id-1", "booking-id-2"]
    }
  ]
}
```

## Database Schema

### CourtAvailabilityBlock Model

```prisma
model CourtAvailabilityBlock {
  id         String    @id @default(uuid())
  courtId    String
  date       DateTime  @db.Date
  startTime  String    // "HH:mm" format
  endTime    String    // "HH:mm" format
  reason     String?   // Optional reason for blocking
  createdBy  String    // User ID who created the block
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  court Court @relation(fields: [courtId], references: [id], onDelete: Cascade)

  @@index([courtId])
  @@index([courtId, date])
}
```

## Migration

Before deploying this feature, run the Prisma migration:

```bash
npx prisma migrate dev --name add_court_availability_blocks
```

## Future Enhancements

1. **Recurring Blocks**: Allow creating blocks that repeat weekly
2. **Bulk Operations**: Add/remove blocks for multiple days/courts at once
3. **Block Templates**: Save common block configurations for reuse
4. **Conflict Resolution UI**: Better interface for resolving booking conflicts
5. **Edit Existing Blocks**: Currently, blocks can only be deleted and recreated. Add direct editing.
6. **Audit Trail**: Track who created/modified/deleted blocks
7. **Internationalization**: Add i18n support for modal text and error messages
8. **Custom Modal**: Replace native `confirm()` with styled Modal component

## Testing

To test this feature:

1. Log in as an admin user (Root Admin, Org Admin, or Club Admin)
2. Navigate to a club detail page
3. Find the WeeklyAvailabilityTimeline component
4. Click "Edit Availability" button
5. Click on a time slot to open the modal
6. Add a block and save
7. Verify the block persists after page refresh
8. Try creating a block that conflicts with an existing booking
9. Verify the error message is displayed

## Troubleshooting

**Edit button doesn't appear**
- Verify user has admin role
- Check API response includes `canEdit: true`
- Ensure user has permission for the specific club

**Save fails with 403 error**
- User doesn't have permission for this club
- Check user's role assignments

**Save fails with 409 error**
- Block conflicts with existing booking
- Adjust block times to avoid overlap
- Or cancel the booking first

**Changes not persisting**
- Check browser console for errors
- Verify API endpoint is accessible
- Check database connection
