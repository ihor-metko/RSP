# Club Statistics System

## Overview

The Club Statistics System provides **real-time reactive calculation** of occupancy statistics for clubs at daily and monthly intervals. Statistics are automatically updated whenever bookings are created, updated, or deleted, ensuring data is always accurate without waiting for batch jobs.

## Features

- **Reactive Daily Statistics**: Automatic real-time calculation when bookings change
- **Transactional Consistency**: Statistics updates are atomic with booking operations
- **Fallback Automation**: Cron job fills gaps for historical or missing data
- **Monthly Statistics**: Lazy-calculated monthly aggregates with trend analysis
- **Organization-Level Views**: Fetch statistics for all clubs in an organization
- **Permission-Based Access**: Role-based filtering for ROOT, Organization, and Club admins

## Architecture

### Real-Time Reactive Updates

Statistics are calculated immediately when bookings are modified:

1. **Booking Created**: Statistics for the booking's date(s) are recalculated
2. **Booking Updated**: Statistics are recalculated (e.g., when status changes to/from cancelled)
3. **Booking Deleted**: Statistics are recalculated to reflect the removal

All updates occur **within the same database transaction** as the booking operation, ensuring:
- Atomicity: Statistics and bookings stay in sync
- Consistency: No race conditions or stale data
- Immediate availability: No waiting for batch jobs

### Database Schema

#### ClubDailyStatistics

Stores daily occupancy data for each club:

```prisma
model ClubDailyStatistics {
  id                  String   @id @default(uuid())
  clubId              String
  date                DateTime @db.Date
  bookedSlots         Int      // Number of slots booked on this day
  totalSlots          Int      // Total available slots for this day
  occupancyPercentage Float    // Calculated as bookedSlots / totalSlots * 100
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([clubId, date])
}
```

#### ClubMonthlyStatistics

Stores monthly aggregated occupancy data:

```prisma
model ClubMonthlyStatistics {
  id                      String   @id @default(uuid())
  clubId                  String
  month                   Int      // Month (1-12)
  year                    Int      // Year
  averageOccupancy        Float    // Average daily occupancy for the month
  previousMonthOccupancy  Float?   // Previous month's average for comparison
  occupancyChangePercent  Float?   // Percentage difference from previous month
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@unique([clubId, month, year])
}
```

### Service Layer

The statistics service (`src/services/statisticsService.ts`) provides core calculation logic:

#### Key Functions

1. **calculateTotalSlots(clubId, date)**: Calculates total available booking slots
   - Considers club business hours
   - Accounts for special hours/closures
   - Multiplies court count by operating hours

2. **calculateBookedSlots(clubId, date)**: Counts booked slots
   - Queries non-cancelled bookings
   - Sums booking durations
   - Excludes cancelled bookings

3. **calculateAndStoreDailyStatistics(clubId, date)**: Complete daily stats workflow
   - Calculates total and booked slots
   - Computes occupancy percentage
   - Upserts to database (no duplicates)

4. **updateStatisticsForBooking(clubId, bookingStart, bookingEnd)**: Reactive update helper
   - Called automatically when bookings are created/updated/deleted
   - Handles multi-day bookings
   - Runs within the same transaction as booking operations
   - **Primary method for keeping statistics current**

5. **getOrCalculateMonthlyStatistics(clubId, month, year)**: Lazy calculation
   - Checks if statistics already exist
   - If missing, calculates from daily data
   - Compares with previous month
   - Stores result for future use

6. **calculateDailyStatisticsForAllClubs(date, fallbackMode)**: Bulk calculation
   - Processes all active clubs
   - In fallback mode: only fills missing statistics
   - Returns success/failure results
   - Used by cron job as a safety net

### Reactive Statistics Flow

When a booking operation occurs:

```
User Action → API Endpoint → Transaction Begin
   ↓
Create/Update/Delete Booking
   ↓
updateStatisticsForBooking(clubId, start, end)
   ↓
Recalculate Statistics for Affected Dates
   ↓
Transaction Commit → Real-time Statistics Available
   ↓
Socket.IO Event → UI Updates
```

**Benefits:**
- Zero latency: Statistics update immediately
- Transactional safety: No inconsistencies
- No stale data: Always reflects current bookings
- Scalable: Only affected dates are recalculated

4. **getOrCalculateMonthlyStatistics(clubId, month, year)**: Lazy calculation
   - Checks if statistics already exist
   - If missing, calculates from daily data
   - Compares with previous month
   - Stores result for future use

5. **calculateDailyStatisticsForAllClubs(date)**: Bulk calculation
   - Processes all active clubs
   - Returns success/failure results
   - Used by cron job

## API Endpoints

### Daily Statistics

#### GET `/api/admin/statistics/daily`

Fetch daily statistics with filtering.

**Query Parameters:**
- `clubId` (optional): Filter by club ID
- `startDate` (optional): Filter start date (ISO format)
- `endDate` (optional): Filter end date (ISO format)

**Permissions:**
- ROOT_ADMIN: All statistics
- ORGANIZATION_ADMIN: Clubs in their organizations
- CLUB_ADMIN: Only their clubs

**Response:**
```json
[
  {
    "id": "uuid",
    "clubId": "club-123",
    "date": "2024-01-15T00:00:00Z",
    "bookedSlots": 20,
    "totalSlots": 50,
    "occupancyPercentage": 40.0,
    "club": {
      "id": "club-123",
      "name": "Downtown Padel Club"
    }
  }
]
```

#### POST `/api/admin/statistics/daily`

Create or update daily statistics.

**Request Body:**
```json
{
  "clubId": "club-123",
  "date": "2024-01-15",
  "bookedSlots": 25,    // Optional - auto-calculated if omitted
  "totalSlots": 50      // Optional - auto-calculated if omitted
}
```

**Auto-Calculation Mode:**
If `bookedSlots` and `totalSlots` are not provided, they will be automatically calculated from:
- Club business hours and courts
- Actual bookings for that date

**Response:**
```json
{
  "id": "uuid",
  "clubId": "club-123",
  "date": "2024-01-15T00:00:00Z",
  "bookedSlots": 25,
  "totalSlots": 50,
  "occupancyPercentage": 50.0
}
```

### Monthly Statistics

#### GET `/api/admin/statistics/monthly`

Fetch monthly statistics with optional lazy calculation.

**Query Parameters (Standard Mode):**
- `clubId` (optional): Filter by club ID
- `organizationId` (optional): Filter by organization ID
- `year` (optional): Filter by year
- `month` (optional): Filter by month (1-12)

**Query Parameters (Lazy Calculation Mode):**
- `clubId` (required): Club to calculate for
- `month` (required): Month (1-12)
- `year` (required): Year
- `lazyCalculate=true`: Enable lazy calculation

**Lazy Calculation for Organization:**
- `organizationId` (required): Organization ID
- `month` (required): Month (1-12)
- `year` (required): Year
- `lazyCalculate=true`: Enable lazy calculation

**Standard Mode Response:**
```json
[
  {
    "id": "uuid",
    "clubId": "club-123",
    "month": 1,
    "year": 2024,
    "averageOccupancy": 45.5,
    "previousMonthOccupancy": 40.0,
    "occupancyChangePercent": 13.75,
    "club": {
      "id": "club-123",
      "name": "Downtown Padel Club"
    }
  }
]
```

**Lazy Calculation Response (Single Club):**
```json
{
  "id": "uuid",
  "clubId": "club-123",
  "month": 1,
  "year": 2024,
  "averageOccupancy": 45.5,
  "previousMonthOccupancy": 40.0,
  "occupancyChangePercent": 13.75
}
```

**Lazy Calculation Response (Organization):**
```json
[
  {
    "clubId": "club-123",
    "clubName": "Downtown Padel Club",
    "statistics": {
      "id": "uuid",
      "averageOccupancy": 45.5,
      "previousMonthOccupancy": 40.0,
      "occupancyChangePercent": 13.75
    }
  },
  {
    "clubId": "club-456",
    "clubName": "Uptown Padel Club",
    "statistics": {
      "id": "uuid",
      "averageOccupancy": 50.0,
      "previousMonthOccupancy": 48.0,
      "occupancyChangePercent": 4.17
    }
  }
]
```

### Cron Job (Fallback Mechanism)

#### POST `/api/cron/calculate-daily-statistics`

Automated endpoint that acts as a **fallback mechanism** to ensure no statistics are missing.

**Purpose:**
- Fill historical gaps in statistics data
- Provide redundancy for reactive updates
- Support initial population of statistics
- **NOT the primary calculation method** (reactive updates handle real-time)

**Authentication:**
Requires `CRON_SECRET` in Authorization header:
```
Authorization: Bearer <CRON_SECRET>
```

**Query Parameters:**
- `date` (optional): Date to calculate for (ISO format). Defaults to yesterday.
- `fallbackMode` (optional): Boolean. If true (default), only calculates missing statistics.

**Response:**
```json
{
  "success": true,
  "date": "2024-01-15T00:00:00Z",
  "fallbackMode": true,
  "totalClubs": 10,
  "successCount": 9,
  "skippedCount": 8,
  "failureCount": 1,
  "results": [
    {
      "clubId": "club-123",
      "clubName": "Downtown Padel Club",
      "success": true,
      "statistics": { /* ... */ }
    },
    {
      "clubId": "club-456",
      "clubName": "Failed Club",
      "success": false,
      "error": "No courts configured"
    }
  ]
}
```

## Usage Examples

### Real-Time Statistics (Primary Method)

Statistics are **automatically updated** when bookings are created, updated, or deleted:

```typescript
// Player creates a booking
POST /api/bookings
{
  "courtId": "court-123",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "userId": "user-456"
}
// → Statistics for 2024-01-15 are automatically recalculated

// Admin updates booking status
PATCH /api/admin/bookings/booking-789
{
  "status": "cancelled"
}
// → Statistics are automatically recalculated

// Admin deletes a booking
DELETE /api/admin/bookings/booking-789
// → Statistics are automatically recalculated
```

### Fallback Statistics via Cron

1. **Daily Fallback (Default Mode)**

```bash
# Called by cron scheduler at midnight
# Only fills missing statistics (skips existing ones)
POST /api/cron/calculate-daily-statistics
Authorization: Bearer <CRON_SECRET>
```

2. **Force Recalculation Mode**

```bash
# Recalculate all statistics regardless of existence
POST /api/cron/calculate-daily-statistics?fallbackMode=false
Authorization: Bearer <CRON_SECRET>
```

3. **Historical Data Population**

```bash
# Calculate for a specific past date
POST /api/cron/calculate-daily-statistics?date=2024-01-01&fallbackMode=false
Authorization: Bearer <CRON_SECRET>
```

### Manual Statistics Management

1. **Manual Calculation for Specific Club**

```bash
POST /api/admin/statistics/daily
{
  "clubId": "club-123",
  "date": "2024-01-15"
  # bookedSlots and totalSlots omitted for auto-calculation
}
```

3. **Manual Entry**

```bash
POST /api/admin/statistics/daily
{
  "clubId": "club-123",
  "date": "2024-01-15",
  "bookedSlots": 30,
  "totalSlots": 60
}
```

4. **Fetch Daily Statistics**

```bash
GET /api/admin/statistics/daily?clubId=club-123&startDate=2024-01-01&endDate=2024-01-31
```

### Monthly Statistics Workflow

1. **Lazy Calculation for Current Month**

```bash
# Automatically calculates if missing
GET /api/admin/statistics/monthly?clubId=club-123&month=1&year=2024&lazyCalculate=true
```

2. **Lazy Calculation for Organization**

```bash
# Calculates for all clubs in organization
GET /api/admin/statistics/monthly?organizationId=org-1&month=1&year=2024&lazyCalculate=true
```

3. **Fetch Existing Statistics**

```bash
# Returns only pre-calculated statistics
GET /api/admin/statistics/monthly?clubId=club-123&year=2024
```

## Calculation Logic

### Daily Occupancy

**Total Slots Formula:**
```
totalSlots = numberOfCourts × operatingHours
```

**Booked Slots Formula:**
```
bookedSlots = Σ(booking duration in hours) for non-cancelled bookings
```

**Occupancy Percentage:**
```
occupancyPercentage = (bookedSlots / totalSlots) × 100
```

### Monthly Occupancy

**Average Occupancy:**
```
averageOccupancy = Σ(daily occupancy percentages) / numberOfDays
```

**Occupancy Change:**
```
occupancyChangePercent = ((current - previous) / previous) × 100
```

Special cases:
- If previous month = 0% and current > 0%: change = 100%
- If both = 0%: change = 0%
- If no previous month data: change = null

## Cron Setup

### Vercel Cron (Recommended for Production)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/calculate-daily-statistics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Alternative: External Cron Service

```bash
# Every day at midnight UTC
0 0 * * * curl -X POST \
  -H "Authorization: Bearer <CRON_SECRET>" \
  https://your-domain.com/api/cron/calculate-daily-statistics
```

### Environment Variables

```env
CRON_SECRET=<minimum-32-character-secret>
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Calculation**: Monthly statistics are only calculated when requested
2. **Upsert Operations**: Prevents duplicate entries in daily statistics
3. **Indexed Queries**: Database indexes on `clubId`, `date`, `month`, and `year`
4. **Batch Processing**: Cron job processes all clubs in a single run

### Database Load

- **Daily Statistics**: 1 upsert per club per day
- **Monthly Statistics**: 1 insert per club per month (only when requested)
- **Queries**: Filtered by role permissions to minimize data transfer

### Scalability

- Service functions are stateless and can be scaled horizontally
- Calculations are independent per club (can be parallelized)
- Monthly statistics cache results to avoid recalculation

## Future Extensions

The system is designed to support additional statistics:

1. **Weekly Statistics**: Add similar lazy calculation for weekly aggregates
2. **Yearly Statistics**: Annual summaries with seasonal trends
3. **Court-Specific Stats**: Per-court occupancy tracking
4. **Revenue Statistics**: Integration with payment data
5. **Predictive Analytics**: Forecasting based on historical data

### Extension Example

To add weekly statistics:

1. Create `ClubWeeklyStatistics` model in schema
2. Add `calculateAverageOccupancyForWeek()` in service
3. Add `getOrCalculateWeeklyStatistics()` function
4. Create API endpoints similar to monthly stats

## Troubleshooting

### Common Issues

**Issue: Statistics show 0% occupancy despite bookings**

- Check if club business hours are configured
- Verify courts are marked as `isActive: true`
- Confirm bookings are not cancelled

**Issue: Monthly calculation returns null**

- Ensure daily statistics exist for that month
- Run daily statistics calculation first
- Check date range includes the full month

**Issue: Cron job fails authentication**

- Verify `CRON_SECRET` is set in environment
- Check secret length (minimum 32 characters)
- Ensure Authorization header format: `Bearer <secret>`

**Issue: Permission denied errors**

- Verify user has correct admin role
- For organization admins: check club belongs to their org
- For club admins: check they manage the specific club

## Testing

The statistics system includes comprehensive tests:

- `statistics-service.test.ts`: Service layer unit tests
- `admin-statistics-daily-api.test.ts`: Daily API endpoint tests
- `admin-statistics-monthly-api.test.ts`: Monthly API endpoint tests
- `cron-calculate-daily-statistics.test.ts`: Cron job tests

Run tests:
```bash
npm test statistics
```

## Security

### Authentication & Authorization

- All endpoints require admin authentication
- Role-based data filtering prevents unauthorized access
- Cron endpoints protected by secret token

### Data Validation

- Input validation on all POST requests
- Date format validation
- Numeric range validation (0-100 for percentages)
- Prevents bookedSlots > totalSlots

### Rate Limiting

- Cron endpoints should be called once per day maximum
- Consider implementing rate limiting for manual API calls in production

## Monitoring

### Key Metrics to Track

1. **Daily Calculation Success Rate**: Monitor cron job success/failure counts
2. **Average Calculation Time**: Track performance of bulk calculations
3. **Lazy Calculation Hit Rate**: Monitor cache effectiveness for monthly stats
4. **API Response Times**: Ensure queries remain performant

### Logging

- Cron job logs success/failure for each club
- Service errors are logged with context
- API errors include request details for debugging

## References

- [Prisma Schema Documentation](../prisma/schema.prisma)
- [Statistics Service Source](../src/services/statisticsService.ts)
- [API Route Handlers](../src/app/api/admin/statistics/)
