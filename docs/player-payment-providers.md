# Step 4 Payment with Provider Selection

## Overview

This document describes the implementation of Step 4 in the PlayerQuickBooking wizard, which provides real payment provider selection instead of hardcoded payment methods.

## Architecture

### Backend Components

#### API Endpoint: `/api/(player)/clubs/[id]/payment-providers`

**Purpose**: Fetch available and verified payment providers for a specific club.

**Access**: Public (no authentication required for browsing)

**Response**:
```json
{
  "providers": [
    {
      "id": "WAYFORPAY",
      "name": "WayForPay",
      "displayName": "WayForPay",
      "logoLight": "/images/payment-providers/wayforpay-light.svg",
      "logoDark": "/images/payment-providers/wayforpay-dark.svg"
    }
  ],
  "message": "Payment provider not yet verified" // Only when providers array is empty
}
```

**Business Logic**:
- Only returns payment providers with VERIFIED status (real payment verification completed)
- Checks club-level payment accounts first, then falls back to organization-level
- Returns empty array if no verified provider is configured
- Includes theme-based logo URLs for light and dark modes

### Frontend Components

#### Updated Components

1. **PlayerQuickBooking.tsx**
   - Added `availablePaymentProviders` state
   - Added `fetchPaymentProviders` function
   - Preloads payment providers when club is selected (for better UX)
   - Fetches providers again when moving to payment step (as fallback)

2. **Step3Payment.tsx**
   - Updated to use `PaymentProviderInfo` instead of hardcoded `PaymentMethod`
   - Displays provider logos that adapt to current theme
   - Shows loading state while fetching providers
   - Shows appropriate error messages if providers fail to load
   - Shows warning if no providers are available
   - Includes image error handling with fallback to text display

3. **types.ts**
   - Added `PaymentProviderInfo` interface:
     ```typescript
     export interface PaymentProviderInfo {
       id: string;
       name: string;
       displayName: string;
       logoLight: string;
       logoDark: string;
     }
     ```
   - Updated `PlayerBookingStep3Data` to use `paymentProvider` instead of `paymentMethod`

#### New Components

1. **useTheme.ts** (Custom Hook)
   - Detects and tracks theme changes (light/dark mode)
   - Uses MutationObserver to watch for theme changes
   - Returns current theme as "light" | "dark"
   - Properly cleans up observer on unmount

## Features

### Provider Selection

- Displays all available and verified payment providers for a club
- Shows provider logos that adapt to the current theme (light/dark)
- Only enables "Pay" button when a provider is selected
- Maintains existing payment integration logic

### User Experience Improvements

- **Preloading**: Payment providers are preloaded when user selects a club (non-blocking)
- **Fallback**: Providers are fetched again when moving to payment step
- **Loading States**: Shows loading indicator while fetching providers
- **Error Handling**: Shows appropriate error messages if fetch fails
- **Image Fallback**: If provider logo fails to load, it gracefully hides the broken image
- **Empty State**: Shows helpful message if no providers are configured

### Theme Support

- Automatically detects current theme (light/dark)
- Displays theme-appropriate provider logos
- Reacts to theme changes in real-time
- Uses reusable `useTheme` custom hook

## Styling

### CSS Classes

- `.rsp-wizard-payment-methods`: Container for payment provider buttons
- `.rsp-wizard-payment-method`: Individual provider button
- `.rsp-wizard-payment-method--selected`: Selected provider state
- `.rsp-wizard-payment-method-logo`: Logo container with proper sizing
- `.rsp-wizard-payment-method-label`: Provider name label
- `.rsp-wizard-alert--warning`: Warning alert for no providers

## Translations

### English (en.json)

```json
{
  "selectPaymentProvider": "Select payment provider",
  "loadingPaymentProviders": "Loading payment providers...",
  "noPaymentProvidersAvailable": "No payment providers are currently available for this club. Please contact support."
}
```

### Ukrainian (uk.json)

```json
{
  "selectPaymentProvider": "Виберіть платіжну систему",
  "loadingPaymentProviders": "Завантаження платіжних систем...",
  "noPaymentProvidersAvailable": "Наразі для цього клубу немає доступних платіжних систем. Будь ласка, зверніться до підтримки."
}
```

## Assets

### Payment Provider Logos

Location: `/public/images/payment-providers/`

Files:
- `wayforpay-light.svg` - WayForPay logo for light theme
- `wayforpay-dark.svg` - WayForPay logo for dark theme
- `liqpay-light.svg` - LiqPay logo for light theme
- `liqpay-dark.svg` - LiqPay logo for dark theme
- `default-light.svg` - Default fallback logo for light theme
- `default-dark.svg` - Default fallback logo for dark theme

**Note**: These are placeholder SVG files. Replace with actual provider logos as needed.

## Supported Providers

Currently supported in database schema:
- **WAYFORPAY**: WayForPay payment provider
- **LIQPAY**: LiqPay payment provider

Future providers mentioned in requirements (not yet in schema):
- Monopass
- Monobank

## Security Considerations

1. **No Sensitive Data**: API endpoint only returns non-sensitive provider information (names, logos)
2. **Verification Required**: Only VERIFIED providers are returned (completed real payment verification)
3. **Public Access**: Endpoint is public to allow browsing, but actual payment requires authentication
4. **Error Handling**: Errors are logged server-side but generic messages shown to users

## Testing

### Manual Testing Checklist

- [ ] Payment providers are fetched when club is selected
- [ ] Providers are displayed with correct logos
- [ ] Logos change when theme switches (light/dark)
- [ ] "Pay" button is disabled until provider is selected
- [ ] "Pay" button is enabled after selecting a provider
- [ ] Loading state shows while fetching providers
- [ ] Error message shows if providers fail to load
- [ ] Warning shows if no providers are available
- [ ] Broken logo images don't break the UI
- [ ] Step 2.5 (Confirmation) remains unchanged
- [ ] Payment flow works end-to-end

### Browser Compatibility

Tested on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

1. **Multiple Providers**: Support for multiple verified providers per club
2. **Provider Preferences**: Remember user's preferred provider
3. **Additional Providers**: Add Monopass and Monobank to database schema
4. **Provider Details**: Show additional provider information (fees, processing time, etc.)
5. **Provider Status**: Show provider availability status (e.g., "Currently unavailable")

## Troubleshooting

### No Providers Showing

**Possible Causes**:
1. Club has no payment account configured
2. Payment account is not verified (VERIFIED status required)
3. API request failed

**Solution**:
1. Check club's payment account in admin panel
2. Ensure payment account has completed real payment verification
3. Check browser console for API errors

### Logos Not Displaying

**Possible Causes**:
1. Logo files missing from `/public/images/payment-providers/`
2. Incorrect logo paths in API response
3. Image format not supported by browser

**Solution**:
1. Verify logo files exist in correct directory
2. Check API response for correct logo paths
3. Ensure logos are in SVG, PNG, or JPEG format

### Theme Not Switching

**Possible Causes**:
1. Theme class not set on `document.documentElement`
2. MutationObserver not detecting changes

**Solution**:
1. Verify theme toggling adds/removes "dark" class on `<html>` element
2. Check browser console for errors in `useTheme` hook
