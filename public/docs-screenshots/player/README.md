# Player Documentation Screenshots

This directory contains screenshots for the Player / Guest flow documentation.

## Required Screenshots

The following screenshots should be placed in this directory:

### Main Flow
- `player__discovery__clubs-list.webp` - Clubs discovery page
- `player__club-details__overview.webp` - Club details page
- `player__booking__calendar.webp` - Calendar booking view
- `player__auth__login-required-modal.webp` - Authentication gate modal
- `player__auth__login.webp` - Login/register page
- `player__auth__register.webp` - Registration page (optional)
- `player__booking__success.webp` - Booking success confirmation

### Quick Booking Flow
- `player__quick-booking__date-time.webp` - Date & time selection
- `player__quick-booking__court-selection.webp` - Court selection
- `player__quick-booking__payment.webp` - Payment step
- `player__quick-booking__success.webp` - Booking success

### Account Management
- `player__account__bookings-list.webp` - Player bookings list
- `player__account__booking-details.webp` - Booking details view

## Screenshot Guidelines

- Format: WebP
- Theme: Dark mode
- Language: Can be EN or UA (both are supported)
- Size: Optimized for web display
- Quality: High resolution, clear UI elements

## Usage

Screenshots are automatically loaded by the DocsImagePlaceholder component:

```tsx
<DocsImagePlaceholder
  role="player"
  step="player__discovery__clubs-list"
  format="webp"
  alt="Clubs discovery page"
  caption="Browse available clubs"
/>
```

If a screenshot is not available, a placeholder icon will be shown instead.
