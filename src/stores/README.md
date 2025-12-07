# Zustand Stores

This directory contains Zustand store implementations for state management.

## useOrganizationStore

A reusable, well-typed Zustand store for managing organizations and the current organization context in the admin UI.

### Features

- **SSR-friendly**: Designed to work seamlessly with Next.js server-side rendering
- **Lightweight**: Minimal bundle size using Zustand
- **Type-safe**: Full TypeScript support with proper type definitions
- **API integration**: Integrates with existing API patterns and endpoints

### Usage

```typescript
import { useOrganizationStore } from '@/stores/useOrganizationStore';

function MyComponent() {
  const { 
    organizations, 
    currentOrg, 
    loading, 
    error,
    fetchOrganizations,
    setCurrentOrg 
  } = useOrganizationStore();

  // Fetch all organizations (for root admin)
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Access computed selectors
  const isSelected = useOrganizationStore(state => state.isOrgSelected('org-id'));
  const specificOrg = useOrganizationStore(state => state.getOrganizationById('org-id'));

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {organizations.map(org => (
        <div key={org.id}>{org.name}</div>
      ))}
    </div>
  );
}
```

### API Methods

#### State
- `organizations: Organization[]` - Cached list of organizations
- `currentOrg: Organization | null` - Currently selected organization
- `loading: boolean` - Loading state
- `error: string | null` - Error message

#### Actions
- `setOrganizations(orgs: Organization[])` - Manually set organizations list
- `setCurrentOrg(org: Organization | null)` - Set current organization
- `fetchOrganizations()` - Load organizations from `/api/admin/organizations`
- `fetchOrganizationById(id: string)` - Load single org and set as current
- `createOrganization(payload)` - Create new organization (optimistic update)
- `updateOrganization(id, payload)` - Update organization (optimistic update)
- `deleteOrganization(id, confirmOrgSlug?)` - Delete organization

#### Selectors
- `getOrganizationById(id: string)` - Get organization from store by ID
- `isOrgSelected(id: string)` - Check if organization is currently selected

### API Endpoints

The store uses the following API endpoints:

- `GET /api/admin/organizations` - List all organizations (root admin)
- `GET /api/orgs/:id` - Get single organization details
- `POST /api/admin/organizations` - Create new organization
- `PUT /api/orgs/:id` - Update organization
- `DELETE /api/admin/organizations/:id` - Delete organization

### Types

See `src/types/organization.ts` for full type definitions:
- `Organization` - Main organization entity
- `CreateOrganizationPayload` - Payload for creating organizations
- `UpdateOrganizationPayload` - Payload for updating organizations

### Testing

Comprehensive tests are available in `src/__tests__/useOrganizationStore.test.ts` covering:
- Initial state
- State setters
- Async actions (fetch, create, update, delete)
- Error handling
- Selectors
- Optimistic updates

Run tests with:
```bash
npm test useOrganizationStore
```

### Best Practices

1. **Optimistic Updates**: Create and update operations use optimistic updates for better UX
2. **Error Handling**: Always handle errors returned by async actions
3. **Loading States**: Use the `loading` state to show loading indicators
4. **Selective Subscription**: Use selectors to subscribe to specific parts of the state
5. **SSR Compatibility**: The store is designed to work with Next.js SSR - state is client-side only

### Example: Creating an Organization

```typescript
const { createOrganization, error } = useOrganizationStore();

const handleCreate = async () => {
  try {
    const newOrg = await createOrganization({
      name: 'My New Organization',
      slug: 'my-new-org'
    });
    console.log('Created:', newOrg);
  } catch (err) {
    console.error('Failed to create:', error);
  }
};
```

### Example: Using Selectors

```typescript
// Subscribe only to specific organization
function OrganizationDetails({ orgId }: { orgId: string }) {
  const org = useOrganizationStore(state => state.getOrganizationById(orgId));
  const isSelected = useOrganizationStore(state => state.isOrgSelected(orgId));
  
  if (!org) return <div>Organization not found</div>;
  
  return (
    <div>
      <h2>{org.name}</h2>
      {isSelected && <span>✓ Selected</span>}
    </div>
  );
}
```
