# Centralized Post-Auth Routing Implementation

## Overview
This document describes the implementation of centralized post-authentication routing for the ArenaOne application. All login methods (Google OAuth and Credentials) now redirect to a single `/post-auth` route that determines the appropriate destination based on user roles and memberships.

## Problem Statement
Previously, post-login redirects were scattered across different components:
- Login buttons had role-based redirect logic
- Sign-in page had complex redirect handling with toast messages
- Google OAuth and credentials login had different redirect mechanisms
- This made it difficult to maintain consistent behavior and added complexity

## Solution
Created a centralized `/post-auth` route that:
1. Acts as a single post-login gate for all authentication methods
2. Performs server-side role checking to avoid UI flash
3. Redirects users to appropriate destinations based on their roles and memberships
4. Maintains a single source of truth for post-login routing

## Implementation Details

### 1. Post-Auth Route (`/src/app/post-auth/page.tsx`)
Server-side page that handles all post-login redirects:

```typescript
export default async function PostAuthPage() {
  const session = await auth();

  // If no session, redirect to sign-in
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Check if user is root admin
  if (isRoot) {
    redirect("/dashboard");
  }

  // Check for admin status (organization or club admin)
  const adminStatus = await checkUserAdminStatus(userId, isRoot);
  
  if (adminStatus.isAdmin) {
    redirect("/dashboard");
  }

  // Check for any organization or club membership (non-admin) concurrently
  const [orgMembership, clubMembership] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId },
      select: { id: true },
    }),
    prisma.clubMembership.findFirst({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (orgMembership || clubMembership) {
    redirect("/dashboard");
  }

  // Regular player with no memberships - redirect to landing page
  redirect("/");
}
```

### 2. Redirect Logic
The routing follows this priority:

1. **Unauthenticated users** → `/auth/sign-in`
2. **Root Admin** → `/dashboard` (admin dashboard)
3. **Organization Admin** → `/dashboard`
4. **Club Admin/Owner** → `/dashboard`
5. **Users with organization membership** → `/dashboard`
6. **Users with club membership** → `/dashboard`
7. **Regular players (no roles/memberships)** → `/` (landing page)

### 3. NextAuth Integration (`/src/lib/auth.ts`)
Added a redirect callback to NextAuth configuration:

```typescript
callbacks: {
  // ... existing callbacks ...
  async redirect({ url, baseUrl }) {
    // If the URL is a relative path, prepend the base URL
    if (url.startsWith("/")) {
      return `${baseUrl}${url}`;
    }
    // If the URL already contains the base URL, use it
    if (url.startsWith(baseUrl)) {
      return url;
    }
    // Default to /post-auth for all sign-ins
    return `${baseUrl}/post-auth`;
  },
}
```

### 4. Component Updates

#### GoogleLoginButton (`/src/components/auth/GoogleLoginButton.tsx`)
- Removed `callbackUrl` prop
- Always redirects to `/post-auth`

```typescript
export function GoogleLoginButton({ disabled = false }: GoogleLoginButtonProps) {
  // ...
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/post-auth" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setIsLoading(false);
    }
  };
  // ...
}
```

#### Sign-In Page (`/src/app/(pages)/auth/sign-in/page.tsx`)
- Removed role-based redirect logic
- Removed toast notifications
- Simplified to always redirect to `/post-auth` after successful login

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("auth.invalidCredentials"));
    } else {
      // Redirect to post-auth for centralized routing
      router.push("/post-auth");
    }
  } catch {
    setError(t("auth.errorOccurred"));
  } finally {
    setLoading(false);
  }
};
```

#### Sign-Up Page (`/src/app/(pages)/auth/sign-up/page.tsx`)
- Updated Google login button to use new API (no callbackUrl prop)

## Performance Optimizations

### Parallel Database Queries
The post-auth route uses `Promise.all()` to execute membership queries in parallel:

```typescript
const [orgMembership, clubMembership] = await Promise.all([
  prisma.membership.findFirst({ where: { userId }, select: { id: true } }),
  prisma.clubMembership.findFirst({ where: { userId }, select: { id: true } }),
]);
```

This reduces latency compared to sequential queries.

## Testing

### Test Coverage (`/src/__tests__/post-auth-routing.test.ts`)
Created comprehensive tests covering all routing scenarios:

1. ✅ Root Admin redirect to `/dashboard`
2. ✅ Organization Admin redirect to `/dashboard`
3. ✅ Club Admin redirect to `/dashboard`
4. ✅ User with organization membership redirect to `/dashboard`
5. ✅ User with club membership redirect to `/dashboard`
6. ✅ Regular player redirect to `/` (landing page)
7. ✅ Unauthenticated user redirect to `/auth/sign-in`

All tests pass successfully.

## Security

### Server-Side Routing
All routing decisions are made server-side in the `/post-auth` route:
- Prevents client-side manipulation
- Avoids exposing role information in client code
- No UI flash or unauthorized access

### CodeQL Security Scan
✅ No security vulnerabilities detected

## Middleware
The middleware at `/middleware.ts` remains unchanged:
- Still protects routes based on roles
- Post-auth routing only determines redirect, not access enforcement
- Middleware provides the access control layer

## Backward Compatibility

### Maintained Compatibility With:
- ✅ All existing NextAuth callbacks
- ✅ Session management
- ✅ JWT token structure
- ✅ Existing authentication flows
- ✅ Middleware route protection

## Benefits

1. **Single Source of Truth**: All post-login routing logic in one place
2. **Easier Maintenance**: Changes to routing logic only need to be made in one file
3. **Consistent Behavior**: All login methods use the same routing logic
4. **Better Performance**: Parallel database queries reduce latency
5. **Improved Security**: Server-side routing prevents client manipulation
6. **No UI Flash**: Users see the correct page immediately without redirects
7. **Future-Proof**: Easy to add new roles or membership types

## Migration Notes

### What Changed
- Login buttons no longer accept `callbackUrl` prop
- Sign-in page no longer shows welcome toast messages
- All post-login redirects go through `/post-auth`

### What Stayed the Same
- User experience (users still land on correct pages)
- Authentication mechanism
- Session management
- Middleware protection
- Role checking logic

## Future Enhancements

Potential improvements that could be made in the future:
1. Add query parameter support for redirecting to specific pages after login
2. Add analytics tracking for post-auth routing
3. Implement A/B testing for different landing pages
4. Add user onboarding flow for new users

## References

- Issue: [Implement centralized post-auth routing](link-to-issue)
- PR: [Implement centralized post-auth routing](link-to-pr)
- Related Docs:
  - `.github/copilot-settings.md` - Universal Role-Based Access Control
  - `/docs/google-oauth-integration.md` - Google OAuth Integration
  - `/docs/session-management-refactoring.md` - Session Management

## Conclusion

The centralized post-auth routing implementation successfully achieves all requirements:
- ✅ Single post-login gate at `/post-auth`
- ✅ Centralized role-based redirect logic
- ✅ Server-side routing to prevent UI flash
- ✅ Compatibility with all existing auth flows
- ✅ Comprehensive test coverage
- ✅ No security vulnerabilities

The implementation simplifies future maintenance and provides a solid foundation for role-based routing in the ArenaOne application.
