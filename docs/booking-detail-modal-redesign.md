# Booking Detail Modal Redesign

## Overview

The Booking Detail Modal has been redesigned to provide a clearer, more user-friendly interface for viewing detailed information about bookings on the Operations page.

## Key Changes

### 1. Enhanced Layout Structure

#### Header Section
- **Court name** displayed as the primary title
- **Time range** prominently shown (e.g., "10:00 AM - 11:00 AM")
- **Date** displayed alongside the time
- **Status badge** positioned on the right with color-coded indicators:
  - `paid` → Green (success)
  - `pending` → Yellow (warning)
  - `reserved` → Blue (info)
  - `cancelled` → Gray (default)

#### Body Sections
The body is now divided into three distinct cards for better organization:

1. **Player Details**
   - Player name
   - Contact email

2. **Booking Details**
   - Date
   - Time range
   - Duration (calculated in minutes)
   - Court name
   - Sport type (PADEL, TENNIS, etc.)
   - Coach name (if assigned)

3. **Payment Information**
   - Price (prominently displayed in larger font)
   - Payment status (with badge)
   - Created at timestamp

#### Actions Section
- **Close** button (outline variant)
- **Cancel Booking** button (danger variant) - only shown for non-cancelled bookings
- Buttons are disabled during cancellation process

### 2. Improved Styling

- **im-* prefix classes** used throughout for consistency with the dark theme system
- **CSS variables** for colors ensure proper theming
- **Card components** provide visual separation between sections
- **Badge components** for status indicators
- **Responsive grid layout** adapts to different screen sizes
- **Custom scrollbar** styling for better UX

### 3. Dark Theme Support

Full support for dark theme with appropriate color adjustments:
- Background colors
- Text colors
- Border colors
- Badge colors
- Shadow effects

### 4. Mobile Responsiveness

Special considerations for mobile devices:
- Modal width adjusts to viewport (95vw on small screens)
- Grid layout switches to single column
- Actions stack vertically
- Reduced padding and font sizes
- Full-width buttons for easier interaction

### 5. Accessibility Enhancements

- **Keyboard navigation** supported
- **Focus states** clearly visible
- **ARIA roles** properly assigned (via Modal component)
- **Semantic HTML** structure
- **Color contrast** meets WCAG standards

## Component API

```typescript
interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: OperationsBooking | null;
  onSuccess: () => void;
}
```

## Usage Example

```tsx
import { BookingDetailModal } from "@/components/club-operations";

function OperationsPage() {
  const [selectedBooking, setSelectedBooking] = useState<OperationsBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBookingClick = (booking: OperationsBooking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    // Refresh bookings list
    fetchBookings();
  };

  return (
    <>
      {/* ... bookings list ... */}
      
      <BookingDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        booking={selectedBooking}
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

## Translation Keys

The following translation keys are used (available in both `en.json` and `uk.json`):

### Operations namespace
- `operations.playerDetails`
- `operations.bookingInfo`
- `operations.paymentInfo`
- `operations.bookingDate`
- `operations.bookingTime`
- `operations.court`
- `operations.sportType`
- `operations.coach`
- `operations.paymentStatus`
- `operations.createdAt`
- `operations.cancelBooking`
- `operations.cancelling`
- `operations.confirmCancel`
- `operations.bookingCancelled`

### Common namespace
- `common.name`
- `common.email`
- `common.duration`
- `common.minutes`
- `common.price`
- `common.close`
- `common.status`

## CSS Classes

### Custom Classes
- `.im-booking-detail` - Main container
- `.im-booking-detail-header` - Header section
- `.im-booking-detail-title` - Court name title
- `.im-booking-detail-header-meta` - Time and date info
- `.im-booking-detail-body` - Scrollable content area
- `.im-booking-detail-card` - Section card wrapper
- `.im-booking-detail-section` - Content section
- `.im-booking-detail-section-title` - Section heading
- `.im-booking-detail-grid` - Responsive grid layout
- `.im-booking-detail-item` - Grid item
- `.im-booking-detail-label` - Field label
- `.im-booking-detail-value` - Field value
- `.im-booking-detail-price` - Price value (emphasized)
- `.im-booking-detail-actions` - Actions footer

### Modal Width Override
```css
.rsp-modal:has(.im-booking-detail) {
  max-width: 56rem; /* 896px - wider for detailed content */
  padding: 0; /* Custom sections handle padding */
}
```

## Testing

Comprehensive tests are available in `src/__tests__/booking-detail-modal.test.tsx`:

- ✅ Renders modal with booking details
- ✅ Displays correct status badges
- ✅ Shows/hides cancel button based on status
- ✅ Handles cancellation with confirmation
- ✅ Respects user rejection of cancellation
- ✅ Renders bookings without coach
- ✅ Displays all section headers
- ✅ Formats duration correctly
- ✅ Uses Card components for organization

## Browser Support

The modal has been tested and works correctly in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements for future iterations:
- [ ] Collapsible sections for extensive information
- [ ] Edit booking functionality
- [ ] Payment method details (when available)
- [ ] Booking notes/comments
- [ ] Number of players field
- [ ] Booking history/audit log

## Related Components

- `Modal` - Base modal component (`@/components/ui`)
- `Button` - Action buttons (`@/components/ui`)
- `Badge` - Status badges (`@/components/ui`)
- `Card` - Section containers (`@/components/ui`)

## Related Files

- Component: `src/components/club-operations/BookingDetailModal.tsx`
- Styles: `src/components/club-operations/BookingDetailModal.css`
- Tests: `src/__tests__/booking-detail-modal.test.tsx`
- Types: `src/types/booking.ts`
- Store: `src/stores/useBookingStore.ts`
