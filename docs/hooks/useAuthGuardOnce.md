# useAuthGuardOnce Hook

## Purpose

The `useAuthGuardOnce` hook prevents unwanted redirects when users reload protected pages. It ensures authentication checks only happen on initial page mount, not on every render or page reload.

## Problem it Solves

Before this hook, pages with authentication guards would redirect users on every mount, including page reloads:
- User visits `/clubs/123`
- User reloads the page
- During hydration, auth state is temporarily "unauthenticated"
- Redirect logic triggers and sends user to `/auth/sign-in` or `/admin/dashboard`
- **User loses their current page!**

## How it Works

The hook uses a `useRef` to track whether the initial auth check has been performed. Once checked, subsequent renders (including page reloads) skip the redirect logic while still maintaining the auth state.

## Usage

### Basic Authentication Guard

```typescript
export default function MyProtectedPage() {
  // Require authentication only
  const { isHydrated, isLoading, user } = useAuthGuardOnce({
    requireAuth: true,
  });

  if (!isHydrated || isLoading) {
    return <LoadingSkeleton />;
  }

  return <div>Protected content</div>;
}
```

### Admin-Only Pages

```typescript
export default function AdminPage() {
  // Require any admin role
  const { isHydrated, isLoading, adminStatus } = useAuthGuardOnce({
    requireAuth: true,
    requireAdmin: true,
  });

  if (!isHydrated || isLoading) {
    return <LoadingSkeleton />;
  }

  return <div>Admin content</div>;
}
```

### Root Admin-Only Pages

```typescript
export default function RootAdminPage() {
  // Require root admin specifically
  const { isHydrated, isLoading, user } = useAuthGuardOnce({
    requireAuth: true,
    requireRoot: true,
  });

  if (!isHydrated || isLoading) {
    return <LoadingSkeleton />;
  }

  return <div>Root admin content</div>;
}
```

### Custom Redirect Path

```typescript
export default function MyPage() {
  // Custom redirect destination
  const { isHydrated, isLoading } = useAuthGuardOnce({
    requireAuth: true,
    redirectTo: "/custom/login",
  });

  // ... rest of component
}
```

## API

### Parameters

```typescript
interface UseAuthGuardOnceOptions {
  requireAuth?: boolean;      // Require user to be authenticated (default: true)
  requireAdmin?: boolean;      // Require user to have any admin role (default: false)
  requireRoot?: boolean;       // Require user to be root admin (default: false)
  redirectTo?: string;         // Custom redirect path (default: "/auth/sign-in")
}
```

### Return Value

```typescript
{
  isHydrated: boolean;     // Whether Zustand store has been hydrated from localStorage
  isLoading: boolean;      // Whether user data is currently loading
  isLoggedIn: boolean;     // Whether user is authenticated
  user: User | null;       // Current user object
  adminStatus: AdminStatus | null;  // Admin status and managed IDs
}
```

## Migration Guide

### Before

```typescript
export default function MyPage() {
  const router = useRouter();
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }
  }, [isHydrated, isLoading, isLoggedIn, router]);

  // Rest of component...
}
```

### After

```typescript
export default function MyPage() {
  const { isHydrated, isLoading, user } = useAuthGuardOnce({
    requireAuth: true,
  });

  // Rest of component...
}
```

## Benefits

1. **Prevents Unwanted Redirects**: Users stay on their current page after reload
2. **Cleaner Code**: Reduces boilerplate authentication logic
3. **Consistent Behavior**: Same auth check pattern across all protected pages
4. **Better UX**: Users don't lose their place when reloading
5. **Maintainable**: Centralized auth guard logic

## Notes

- The hook only performs the redirect check **once** per page mount
- Page reloads create a new React component instance, but the `useRef` ensures the check still only runs once
- The hook waits for both hydration and loading to complete before checking auth
- Multiple options can be combined (e.g., `requireAuth` + `requireAdmin`)
