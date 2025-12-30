# UserSearchDropdown Component

## Overview
A reusable autocomplete dropdown component for user selection with proper overlay positioning. This component provides a consistent, accessible, and user-friendly interface for searching and selecting users across the application.

## Location
`src/components/ui/UserSearchDropdown.tsx`

## Purpose
Replaces inline user lists with scrollbars with a modern overlay dropdown approach, improving:
- Visual hierarchy (dropdown overlays content instead of being inline)
- User experience (no cluttered scrollbars within modals)
- Accessibility (full keyboard navigation and ARIA support)
- Reusability (can be used anywhere user selection is needed)

## Features

### 1. Overlay Positioning
- Uses `position: absolute` with `z-index: 50`
- Opens below the input field
- Scrolls independently if results exceed max height (300px)
- Positioned above other content in the modal

### 2. Keyboard Navigation
- **Arrow Down**: Navigate to next user
- **Arrow Up**: Navigate to previous user
- **Enter**: Select focused user
- **Escape**: Close dropdown

### 3. User Status Indication
- Supports disabling users based on custom criteria
- Displays reason for disabled state (e.g., "Already Admin in Organization X")
- Prevents selection of disabled users

### 4. Search Functionality
- Real-time search as user types
- Loading indicator during search
- "No users found" message when search returns empty
- Debouncing handled by parent component via `onSearchChange`

### 5. Accessibility
- ARIA attributes for screen readers
- Proper role attributes (`listbox`, `option`)
- Keyboard-only navigation support
- Focus management

## Usage

### Basic Example
```typescript
import { UserSearchDropdown } from "@/components/ui";

function MyComponent() {
  const [selectedUserId, setSelectedUserId] = useState("");
  const users = useAdminUsersStore((state) => state.simpleUsers);
  const fetchUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const isSearching = useAdminUsersStore((state) => state.loading);

  return (
    <UserSearchDropdown
      onSelect={setSelectedUserId}
      users={users}
      onSearchChange={fetchUsers}
      isSearching={isSearching}
      placeholder="Search by name or email..."
      label="Search Users"
    />
  );
}
```

### With Disabled Users
```typescript
const getUserDisabledInfo = (user: SimpleUser) => {
  if (user.roles && user.roles.length > 0) {
    const role = user.roles[0];
    const reason = role.role === "owner" 
      ? `Already Owner of ${role.contextName}`
      : `Already Admin in ${role.contextName}`;
    return { disabled: true, reason };
  }
  return { disabled: false };
};

<UserSearchDropdown
  onSelect={handleUserSelect}
  users={users}
  onSearchChange={fetchUsers}
  getUserDisabledInfo={getUserDisabledInfo}
  translationPrefix="clubAdmins"
/>
```

## Props

```typescript
interface UserSearchDropdownProps {
  // Callback when user is selected (receives user ID)
  onSelect: (userId: string) => void;
  
  // Array of users to display in dropdown
  users: SimpleUser[];
  
  // Callback when search input changes (receives search query)
  onSearchChange: (query: string) => void;
  
  // Optional: Show loading indicator
  isSearching?: boolean;
  
  // Optional: Placeholder text for input
  placeholder?: string;
  
  // Optional: Label for input field
  label?: string;
  
  // Optional: Disable the input
  disabled?: boolean;
  
  // Optional: Function to determine if user should be disabled
  getUserDisabledInfo?: (user: SimpleUser) => { 
    disabled: boolean; 
    reason?: string 
  };
  
  // Optional: Translation namespace prefix (default: "clubAdmins")
  translationPrefix?: string;
}
```

## Styling

The component uses CSS classes from `CreateAdminWizard.css`:

### Key CSS Classes
- `.im-autocomplete-wrapper` - Container for input and dropdown
- `.im-autocomplete-dropdown` - The overlay dropdown
- `.im-autocomplete-item` - Individual user item
- `.im-autocomplete-item--disabled` - Disabled user styling
- `.im-autocomplete-item-name` - User name display
- `.im-autocomplete-item-email` - User email display
- `.im-autocomplete-item-role-indicator` - Disabled reason display
- `.im-focused` - Keyboard-focused item

### Customization
To customize styles, override CSS variables:
```css
--im-dropdown-bg
--im-dropdown-border
--im-item-bg
--im-item-hover-bg
--im-item-disabled-bg
--im-item-name
--im-item-email
--im-role-indicator
```

## Translations Required

The component expects the following translation keys under the specified `translationPrefix` (default: `clubAdmins`):

- `searching` - Loading indicator text
- `noUsersFound` - Message when search returns no results

Example:
```json
{
  "clubAdmins": {
    "searching": "Searching...",
    "noUsersFound": "No users found. Try a different search."
  }
}
```

## Integration Example: ClubAdminsTable

### Before (Inline List)
```typescript
<Input
  label="Search Users"
  value={userSearch}
  onChange={(e) => handleUserSearchChange(e.target.value)}
/>
<div className="im-user-list">
  {simpleUsers.map((u) => (
    <label className="im-user-option">
      <input type="radio" ... />
      <span>{u.name}</span>
    </label>
  ))}
</div>
```

### After (Overlay Dropdown)
```typescript
<UserSearchDropdown
  onSelect={handleUserSelect}
  users={simpleUsers}
  onSearchChange={fetchSimpleUsers}
  isSearching={isSearching}
  label="Search Users"
  getUserDisabledInfo={getUserDisabledInfo}
/>
```

## Benefits

1. **Better UX**: Dropdown overlays content instead of taking up space
2. **Cleaner UI**: No inline scrollbars within modals
3. **Consistent**: Reusable across all user selection scenarios
4. **Accessible**: Full keyboard support and screen reader friendly
5. **Maintainable**: Single source of truth for user search behavior

## Testing

The component includes comprehensive unit tests covering:
- Rendering with label and placeholder
- Dropdown display with users
- Disabled user indication
- User selection callback
- Disabled user click prevention
- Search indicator display
- Empty results message
- Search input callback

Run tests:
```bash
npm test -- user-search-dropdown.test.tsx
```

## Future Enhancements

Potential improvements:
- Support for multi-select
- Grouped results (e.g., by role or organization)
- Custom item renderer
- Virtual scrolling for large user lists
- Highlighted search terms
