# Player Booking Payment Flow Implementation

## Overview
This document describes the implementation of the player-side booking payment flow, where players pay for court bookings using verified payment accounts (WayForPay or LiqPay).

## Architecture

### Core Principles
1. **Backend is the single source of truth** - All payment logic is server-side
2. **No frontend payment account selection** - Backend automatically resolves the correct payment account
3. **Payment confirmation only after provider callback** - Booking is confirmed when payment provider sends success callback
4. **Idempotent design** - Safe handling of duplicate callbacks
5. **Security first** - Payment account secrets never exposed to frontend

### Payment Account Resolution Strategy
When processing a payment:
1. Try to find ACTIVE + VERIFIED club-level Payment Account
2. If not found → fallback to organization-level Payment Account
3. If still not found → return 409 "Payment unavailable"

## Database Schema

### PaymentIntent Model
```prisma
model PaymentIntent {
  id               String   @id @default(uuid())
  bookingId        String
  paymentAccountId String
  provider         PaymentProvider
  orderReference   String   @unique
  amount           Int      // in minor units (e.g., cents)
  currency         String   @default("UAH")
  status           String   @default("pending") // "pending", "paid", "failed", "cancelled"
  
  // Payment callback data
  transactionId    String?
  authCode         String?
  cardPan          String?
  cardType         String?
  signatureValid   Boolean?
  callbackData     String?  @db.Text
  errorMessage     String?  @db.Text
  
  // Timestamps
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  completedAt      DateTime?
}
```

## API Endpoints

### 1. POST /api/player/bookings/pay
Initiates a player booking payment.

**Request:**
```json
{
  "clubId": "uuid",
  "courtId": "uuid",
  "startAt": "2024-01-15T10:00:00Z",
  "endAt": "2024-01-15T11:00:00Z",
  "paymentProvider": "WAYFORPAY"
}
```

**Response (200 OK):**
```json
{
  "checkoutUrl": "https://secure.wayforpay.com/invoice/xyz",
  "bookingId": "uuid",
  "paymentIntentId": "uuid",
  "orderReference": "booking_uuid_timestamp",
  "amount": 5000,
  "currency": "UAH"
}
```

**Error Responses:**
- `400` - Invalid input (missing fields, invalid dates, etc.)
- `401` - Unauthorized (not authenticated)
- `409` - Payment not available (no verified payment account configured)

**Security:**
- `paymentAccountId` is NOT accepted from frontend
- Backend resolves payment account automatically
- Only verified payment accounts are used

### 2. GET /api/player/bookings/[id]/status
Polls booking status after payment initiation.

**Response (200 OK):**
```json
{
  "bookingId": "uuid",
  "bookingStatus": "Confirmed",
  "paymentStatus": "Paid",
  "paymentIntentStatus": "paid",
  "courtName": "Court 1",
  "clubName": "Test Club",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "price": 5000
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - Booking not found or not owned by user

### 3. POST /api/webhooks/wayforpay/payment
Handles payment callbacks from WayForPay.

**Callback Data:**
```json
{
  "merchantAccount": "merchant_id",
  "orderReference": "booking_uuid_timestamp",
  "amount": "50.00",
  "currency": "UAH",
  "authCode": "123456",
  "cardPan": "4***1111",
  "transactionStatus": "Approved",
  "reasonCode": "",
  "merchantSignature": "hmac_signature",
  "transactionId": "txn_123",
  "cardType": "Visa"
}
```

**Response:**
```json
{
  "orderReference": "booking_uuid_timestamp",
  "status": "accept",
  "time": 1234567890
}
```

**Processing:**
1. Validate signature using HMAC-MD5
2. Check payment intent status (idempotency)
3. Update PaymentIntent status
4. Update Booking status if payment approved
5. Return accept/decline status

## Service Layer

### bookingPaymentService.ts

#### initiatePlayerBookingPayment()
Main function for initiating player payments.

**Flow:**
1. Validate and parse dates
2. Validate court exists and belongs to club
3. Check booking availability (no overlapping bookings)
4. Calculate price (uses court's default price)
5. Resolve payment account (club → organization fallback)
6. Create booking with status "Confirmed" and payment status "Unpaid"
7. Create PaymentIntent with status "pending"
8. Generate checkout URL from payment provider
9. Return checkout URL to frontend

#### handleBookingPaymentCallback()
Handles payment callbacks from providers.

**Flow:**
1. Find PaymentIntent by orderReference
2. Check if already processed (idempotency)
3. Validate signature
4. Update PaymentIntent with callback data
5. If approved: Update booking to "Paid", status "Confirmed"
6. If failed: Update booking to "Cancelled"
7. Return success/failure result

#### getBookingStatus()
Returns booking status for frontend polling.

**Flow:**
1. Validate user owns the booking
2. Fetch booking with court and club details
3. Fetch latest payment intent
4. Return combined status

## Frontend Integration

### Payment Flow

```typescript
// 1. Initiate payment
const response = await fetch('/api/player/bookings/pay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clubId,
    courtId,
    startAt,
    endAt,
    paymentProvider: 'WAYFORPAY'
  })
});

const { checkoutUrl, bookingId } = await response.json();

// 2. Open checkout in new window (NO IFRAME!)
window.open(checkoutUrl, '_blank', 'noopener,noreferrer');

// 3. Poll booking status
const pollStatus = setInterval(async () => {
  const statusResponse = await fetch(`/api/player/bookings/${bookingId}/status`);
  const status = await statusResponse.json();
  
  if (status.paymentStatus === 'Paid') {
    clearInterval(pollStatus);
    // Show success message
  } else if (status.bookingStatus === 'Cancelled') {
    clearInterval(pollStatus);
    // Show failure message
  }
}, 2000); // Poll every 2 seconds

// 4. Stop polling after timeout
setTimeout(() => {
  clearInterval(pollStatus);
}, 5 * 60 * 1000); // 5 minutes
```

### Important Frontend Rules
- ✅ Use `window.open()` to open checkout
- ❌ DO NOT use iframe or embedded checkout
- ✅ Show "Waiting for payment confirmation..." loader
- ❌ DO NOT confirm payment based on returnUrl
- ✅ Poll status endpoint after opening checkout
- ❌ DO NOT poll on every render or input change

## Security Features

### 1. Payment Account Security
- Secrets encrypted at rest in database
- Never exposed to frontend
- Decrypted only server-side when needed
- Used only for signature generation and validation

### 2. Amount Validation
- Booking price calculated server-side
- Client cannot manipulate the amount
- Payment provider validates amount in callback
- Backend validates amount matches expected price

### 3. Signature Validation
```typescript
// WayForPay signature validation
const signatureString = [
  merchantAccount,
  orderReference,
  amount,
  currency,
  authCode || '',
  cardPan || '',
  transactionStatus,
  reasonCode || ''
].join(';');

const expectedSignature = crypto
  .createHmac('md5', secretKey)
  .update(signatureString)
  .digest('hex');

return expectedSignature === merchantSignature;
```

### 4. Idempotency
- PaymentIntent provides unique orderReference
- Webhook checks payment status before updating
- Duplicate callbacks return success without re-processing
- Prevents double-confirmation of bookings

### 5. Authorization
- All endpoints require authentication
- Booking status endpoint verifies ownership
- Payment initiation validates court access

## Error Handling

### Client Errors (4xx)
- `400 Bad Request` - Invalid input, validation failed
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Booking/Court not found
- `409 Conflict` - Payment not available, time slot taken

### Server Errors (5xx)
- `500 Internal Server Error` - Unexpected errors
- Logged for debugging
- Generic message returned to client

### Payment Provider Errors
- Timeout after 10 seconds
- Network errors logged and returned as 500
- API errors logged with reason code only (no sensitive data)

## Testing

### Unit Tests
- ✅ Payment initiation with valid input
- ✅ Reject paymentAccountId from frontend
- ✅ Return 409 when no payment account configured
- ✅ Webhook callback handling with valid signature
- ✅ Webhook idempotency (duplicate callbacks)
- ✅ Booking status polling
- ✅ Authorization checks

### Integration Tests
Manual testing required for:
- End-to-end payment flow with real WayForPay account
- Callback handling from payment provider
- Status polling from frontend

## Monitoring & Logging

### Logs
- Payment initiation: clubId, courtId, amount
- Checkout URL generation: success/failure
- Webhook callback: orderReference, transactionStatus
- Signature validation: success/failure
- Booking updates: bookingId, status changes

### Alerts (Recommended)
- High rate of payment failures
- Webhook signature validation failures
- Payment provider API timeouts
- Unusual booking patterns

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
ENCRYPTION_KEY="32-byte-hex-key"

# Optional
APP_URL="https://your-domain.com"  # Server-only callback URL
DEFAULT_BOOKING_PHONE="380000000000"  # Default phone for bookings
```

## Future Enhancements

1. **Additional Payment Providers**
   - LiqPay integration
   - Stripe integration
   - Apple Pay / Google Pay

2. **Payment Features**
   - Refunds
   - Partial payments
   - Payment plans

3. **Monitoring**
   - Payment success/failure dashboards
   - Transaction monitoring
   - Fraud detection

4. **Optimizations**
   - Caching payment account resolution
   - Batch booking payments
   - Webhook retry logic

## Troubleshooting

### Payment Not Available (409)
**Cause:** No verified payment account configured
**Solution:** 
1. Check if club has a verified payment account
2. Check if organization has a verified payment account
3. Verify payment account status is "VERIFIED"

### Signature Validation Failed
**Cause:** Invalid signature in webhook callback
**Solution:**
1. Check payment account secret key is correct
2. Verify signature calculation matches provider spec
3. Check for extra whitespace in signature fields

### Booking Not Confirmed
**Cause:** Webhook callback not received or failed
**Solution:**
1. Check webhook endpoint is accessible from internet
2. Verify callback URL in payment provider dashboard
3. Check webhook logs for errors
4. Manually check payment intent status in database

### Timeout on Checkout URL Generation
**Cause:** Payment provider API slow or unavailable
**Solution:**
1. Increase timeout (currently 10s)
2. Check payment provider status
3. Retry payment initiation
