# State Management Quick Reference

> **1-Page Decision Tree for ArenaOne Developers**

---

## 🤔 Should I use a store or direct fetch?

```
┌─────────────────────────────────────┐
│  What kind of data am I fetching?   │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    ┌───▼───┐    ┌───▼────┐
    │Domain │    │NOT     │
    │ Data? │    │Domain? │
    └───┬───┘    └───┬────┘
        │            │
    ┌───▼────────┐   │
    │USE STORE ✅│   │
    └────────────┘   │
                     │
        ┌────────────▼────────────┐
        │ What type of operation? │
        └────────┬────────────────┘
                 │
         ┌───────┼───────┐
         │       │       │
    ┌────▼──┐ ┌─▼──┐ ┌──▼────┐
    │Upload │ │List│ │User   │
    │Mutate │ │+   │ │Specific│
    │Admin  │ │Pag │ │Query  │
    └───┬───┘ └─┬──┘ └──┬────┘
        │       │       │
    ┌───▼───────▼───────▼────┐
    │ DIRECT FETCH OK ✅     │
    └────────────────────────┘
```

---

## 🎯 Domain Data (Use Stores)

| Data Type | Store | Pattern |
|-----------|-------|---------|
| **Organizations** | `useOrganizationStore` | `getOrganizationsWithAutoFetch()` |
| **Clubs** | `useClubStore` | `fetchClubsIfNeeded({ organizationId })` |
| **Bookings (Calendar)** | `useBookingStore` | `fetchBookingsForDay(clubId, date)` |
| **User/Auth** | `useUserStore` | Auto-loaded via `UserStoreInitializer` |

---

## ✅ Quick Patterns

### Pattern 1: Load Organizations
```tsx
// Auto-fetch (recommended)
const organizations = useOrganizationStore(
  state => state.getOrganizationsWithAutoFetch()
);
```

### Pattern 2: Load Clubs
```tsx
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);

useEffect(() => {
  fetchClubsIfNeeded({ organizationId: orgId });
}, [fetchClubsIfNeeded, orgId]);
```

### Pattern 3: Ensure Single Entity
```tsx
import { ensureClubContext } from '@/lib/storeHelpers';

const club = await ensureClubContext(clubId);
// Club guaranteed loaded, cached if available
```

### Pattern 4: Check User Role
```tsx
const hasRole = useUserStore(state => state.hasRole);
const isOrgAdmin = useUserStore(state => state.isOrgAdmin);

if (hasRole('ROOT_ADMIN')) {
  // Root admin logic
}
```

---

## ⛔ When NOT to Use Stores

### Direct Fetch OK For:

**1. Specialized Operations**
```tsx
// ✅ Image upload
fetch(`/api/admin/organizations/${id}/images`, { 
  method: 'POST', 
  body: formData 
});

// ✅ Admin assignment
fetch('/api/admin/organizations/assign-admin', { 
  method: 'POST', 
  body: JSON.stringify(payload) 
});
```

**2. Public Endpoints with Server Filtering**
```tsx
// ✅ Public clubs search
fetch(`/api/clubs?city=Kyiv&sport=padel&indoor=true`);
```

**3. User-Specific Queries**
```tsx
// ✅ Player's bookings
fetch(`/api/bookings?userId=${userId}&upcoming=true`);
```

**4. Admin Lists with Pagination**
```tsx
// ✅ Admin users list
fetch(`/api/admin/users?page=2&perPage=25&q=john`);
```

---

## 🔄 Cache Invalidation

After mutations, invalidate the cache:

```tsx
import { invalidateOrganizations, invalidateClubs } from '@/lib/storeHelpers';

// After creating/updating organization
await updateOrganization(id, data);
invalidateOrganizations();

// After creating/updating club
await createClub(data);
invalidateClubs();
```

---

## 🎨 Common Selectors

### Minimal Selectors (Prevent Re-renders)
```tsx
// ✅ Good - only re-renders when loading changes
const loading = useOrganizationStore(state => state.loading);

// ❌ Avoid - re-renders on any store change
const store = useOrganizationStore();
const loading = store.loading;
```

### Derived Selectors
```tsx
// Get specific club from list
const club = useClubStore(state => 
  state.clubs.find(c => c.id === clubId)
);

// Check if user is admin
const isAdmin = useUserStore(state => state.isAdmin());
```

---

## 🚨 Common Mistakes

### ❌ DON'T: Duplicate Store State Locally
```tsx
// ❌ Bad
const [localOrgs, setLocalOrgs] = useState([]);
const orgs = useOrganizationStore(state => state.organizations);
useEffect(() => setLocalOrgs(orgs), [orgs]);
```

### ✅ DO: Use Store Directly
```tsx
// ✅ Good
const organizations = useOrganizationStore(state => state.organizations);
```

---

### ❌ DON'T: Fetch Domain Data Directly
```tsx
// ❌ Bad
useEffect(() => {
  fetch('/api/admin/clubs')
    .then(res => res.json())
    .then(setClubs);
}, []);
```

### ✅ DO: Use Store Method
```tsx
// ✅ Good
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);
useEffect(() => {
  fetchClubsIfNeeded();
}, [fetchClubsIfNeeded]);
```

---

### ❌ DON'T: Check Roles Directly
```tsx
// ❌ Bad
if (session.user.isRoot) { }
if (user.role === 'ROOT_ADMIN') { }
```

### ✅ DO: Use Store Helpers
```tsx
// ✅ Good
const hasRole = useUserStore(state => state.hasRole);
if (hasRole('ROOT_ADMIN')) { }
```

---

## 📚 Documentation Links

- **Comprehensive Guide:** `/docs/architecture/data-fetching-guidelines.md`
- **Store README:** `/src/stores/README.md`
- **Helper Functions:** `/src/lib/storeHelpers.ts`
- **Audit Report:** `/docs/architecture/global-state-management-audit.md`

---

## 🆘 Still Not Sure?

**Ask yourself:**
1. Is this organization, club, or booking data? → **Use Store**
2. Is this an upload or admin assignment? → **Direct Fetch OK**
3. Is this a public API with complex filters? → **Direct Fetch OK**
4. Is this user-specific (my bookings, my profile)? → **Direct Fetch OK**
5. Is this an admin list with pagination? → **Direct Fetch OK**

**When in doubt, check:** `/src/lib/storeHelpers.ts` has `isDomainDataFetch(url)` helper!

---

**Last Updated:** December 21, 2024  
**Version:** 1.0
