# Admin Dashboard QA Checklist

## Manual Testing Checklist

### Authentication & Authorization

- [ ] Root Admin can access dashboard
- [ ] Organization Admin can access dashboard
- [ ] Club Admin can access dashboard
- [ ] Non-admin users are redirected to login
- [ ] Unauthorized users see 403 error

### Root Admin Dashboard

- [ ] Platform statistics display correctly (Organizations, Clubs counts)
- [ ] Registered Users card shows player count
- [ ] Bookings Overview shows correct active/past counts
- [ ] Dashboard Graphs render without errors
- [ ] Platform overview section displays

### Organization Admin Dashboard

- [ ] Quick Actions card shows Create Club and Invite Admin
- [ ] Quick Actions links contain organization ID in URL
- [ ] Clubs count displays correctly
- [ ] Admins Panel shows org admins and club admins counts
- [ ] Admins Panel links are org-scoped
- [ ] Bookings Overview shows aggregated counts across organization
- [ ] Dashboard Graphs render without errors

### Club Admin Dashboard

- [ ] Quick Actions shows Create Court (with clubId)
- [ ] Quick Actions doesn't show when clubId missing
- [ ] Clubs Preview shows all managed clubs
- [ ] Club cards display correct metrics (courts, bookings)
- [ ] View Details links work for each club
- [ ] View All Clubs link works
- [ ] Show More button appears when >5 clubs
- [ ] Dashboard Graphs render without errors

### Responsive Design

- [ ] Desktop layout (1024px+) displays correctly
- [ ] Tablet layout (768px-1023px) displays correctly
- [ ] Mobile layout (<768px) displays correctly
- [ ] Quick Actions grid adapts to screen size
- [ ] Clubs Preview grid adapts to screen size
- [ ] All cards are touch-friendly on mobile

### Accessibility

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] ARIA labels are present
- [ ] Screen reader announces loading states
- [ ] Color contrast meets WCAG 2.1 AA standards

### Loading States

- [ ] Initial dashboard shows loading spinner
- [ ] Component skeletons display during data fetch
- [ ] Loading states don't block UI

### Error Handling

- [ ] Failed data fetch shows error message
- [ ] 401 errors redirect to login
- [ ] 403 errors show access denied message
- [ ] Network errors are handled gracefully

### Internationalization

- [ ] English (en) translations display correctly
- [ ] Ukrainian (uk) translations display correctly
- [ ] Language switcher works on dashboard
- [ ] Numbers are formatted with locale
- [ ] Dates are formatted with locale

### Performance

- [ ] Dashboard loads within 2 seconds
- [ ] No unnecessary re-renders
- [ ] Single API call for dashboard data
- [ ] Images and icons load efficiently

### Data Accuracy

- [ ] Organization count matches actual count
- [ ] Club count matches actual count
- [ ] Bookings today reflects current day
- [ ] Active bookings count is accurate
- [ ] Past bookings count is accurate
- [ ] Admin counts are correct

## Automated Test Results

- [ ] All unit tests pass (21 tests)
- [ ] Linting passes with no errors
- [ ] TypeScript compilation succeeds
- [ ] No console errors in browser

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Notes

Add any observations, bugs, or suggestions here:

---

## Sign-off

- [ ] QA Testing Complete
- [ ] All critical issues resolved
- [ ] Documentation reviewed
- [ ] Ready for deployment

**Tested by**: _______________  
**Date**: _______________
