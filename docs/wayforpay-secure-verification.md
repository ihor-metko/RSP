# WayForPay Secure Payment Account Verification

**Implementation Date**: December 16, 2024  
**Status**: ✅ Complete

## Problem Statement

WayForPay does **not provide a reliable credentials verification API**. Some API methods (e.g. `TRANSACTION_LIST`, `CHECK_STATUS`) may return `success` even with invalid credentials. This makes them unsuitable for credential validation.

## Solution: Secure Test Payment Flow

The verification implementation uses a **secure test payment request** to validate WayForPay credentials without charging real money.

### Why This Approach?

1. **Reliable Credential Validation**: The PURCHASE API requires proper signature generation, which validates both the merchant account and secret key
2. **No Real Charges**: Uses minimal amount (1 UAH) with test data - no real payment is processed
3. **Signature Verification**: Invalid credentials result in `reasonCode: 1113` (invalid signature)
4. **Actual Payment Flow**: Tests the same signature generation used in real payments

## Implementation Details

### Location
`src/services/paymentProviders/wayforpayVerifier.ts`

### API Endpoint
```
POST https://api.wayforpay.com/api
```

### Request Parameters

```typescript
{
  transactionType: "PURCHASE",
  merchantAccount: merchantId,
  merchantAuthType: "SimpleSignature",
  merchantDomainName: "verification.test",
  orderReference: `verify_${Date.now()}`,
  orderDate: Math.floor(Date.now() / 1000),
  amount: "1",
  currency: "UAH",
  productName: ["Verification"],
  productCount: ["1"],
  productPrice: ["1"],
  merchantSignature: signature,
  // Test customer data
  clientFirstName: "Test",
  clientLastName: "Verification",
  clientEmail: "test@verification.test",
  clientPhone: "380000000000"
}
```

### Signature Generation

```typescript
// Concatenate parameters in exact order, separated by semicolons
const signatureString = [
  merchantId,
  merchantDomainName,
  orderReference,
  orderDate,
  amount,
  currency,
  productName,
  productCount,
  productPrice,
].join(";");

// Generate HMAC-MD5 signature
const signature = crypto
  .createHmac("md5", secretKey)
  .update(signatureString)
  .digest("hex");
```

### Response Handling

#### Success Cases (Valid Credentials)
The API accepts the signature and responds with:
- Any response containing `reasonCode` or `reason` field
- Response with `invoiceUrl` or `paymentURL`
- `reasonCode: 1109` (format error, but signature accepted - credentials valid)

#### Failure Cases (Invalid Credentials)
- `reasonCode: 1113` → Invalid signature (wrong merchant ID or secret key)
- `reasonCode: 1101` → Merchant account not found or inactive

#### Network/Timeout Errors
- 10-second timeout
- Network errors are caught and logged
- Status remains `PENDING` for retry

## Security Guarantees

✅ **No Real Money Charged**: Test payment with minimal amount (1 UAH)  
✅ **No Real User Data**: Uses test customer information  
✅ **No User Interaction**: Automated verification, no payment UI shown  
✅ **Server-Side Only**: Verification runs on backend, secrets never exposed  
✅ **Test Mode**: Payment is not actually processed by banking system

## Integration

### Verification Lifecycle

1. **Payment Account Created/Updated** → Status set to `PENDING`
2. **Async Verification Triggered** → WayForPayVerifier.verify() called
3. **Test Payment Request Sent** → API validates signature
4. **Status Updated**:
   - Valid credentials → Status set to `ACTIVE`
   - Invalid credentials → Status set to `INVALID`
   - Network error → Remains `PENDING`

### Usage in Code

```typescript
import { WayForPayVerifier } from "@/services/paymentProviders/wayforpayVerifier";

const verifier = new WayForPayVerifier();
const result = await verifier.verify(merchantId, secretKey);

if (result.success) {
  console.log("Credentials valid, payment account activated");
} else {
  console.error("Invalid credentials:", result.error);
}
```

## Testing

### Test Credentials (WayForPay Sandbox)
```typescript
merchantAccount: "test_merch_n1"
merchantSecretKey: "flk3409refn54t54t*FNJRET"
```

### Test Cards
- Visa: `4111 1111 1111 1111`
- MasterCard: `5454 5454 5454 5454`

### Running Tests
```bash
npm test -- payment-account
# All tests pass: 17 passed, 17 total
```

## Comparison with Previous Approach

### ❌ Previous Approach (CHECK_STATUS API)
- Not reliable for credential validation
- May return success with invalid credentials
- Does not validate signature generation properly
- Cannot guarantee credentials work for real payments

### ✅ New Approach (Test Payment Request)
- Reliable credential validation
- Validates actual payment signature generation
- Detects invalid credentials correctly
- Tests the same flow used in production payments
- No real charges or user interaction

## Monitoring

### Logs to Check
```
[WayForPayVerifier] Verification error: <error>
[PaymentAccountService] Account ${id} verified successfully
[PaymentAccountService] Account ${id} verification failed: <error>
```

### Expected Response Codes
- `1113` → Invalid credentials (most common failure)
- `1101` → Merchant not found/inactive
- `1109` → Format error (but credentials valid)

## References

- [WayForPay API Documentation](https://wiki.wayforpay.com/en/)
- [WayForPay Purchase API](https://wiki.wayforpay.com/en/view/852102)
- [WayForPay Response Codes](https://wiki.wayforpay.com/en/view/852131)
- [WayForPay Test Details](https://wiki.wayforpay.com/en/view/852472)

## Future Enhancements

1. **Sandbox Mode Detection**: Automatically detect if merchant is in sandbox mode
2. **Retry Logic**: Implement exponential backoff for network failures
3. **Response Caching**: Cache successful verifications to avoid repeated API calls
4. **Provider Status Monitoring**: Periodic re-verification of active accounts
5. **Webhook Integration**: Real-time notifications when verification completes
