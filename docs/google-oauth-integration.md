# Google OAuth Integration

## Overview

This document describes the Google OAuth integration implemented using NextAuth.js v5. The integration allows users to sign in or register using their Google accounts while maintaining proper role-based access control.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Google OAuth (for NextAuth)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Select "Web application" as the application type
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env` file

## Architecture

### NextAuth Configuration

The Google OAuth provider is configured in `src/lib/auth.ts` alongside the existing Credentials provider:

```typescript
providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Credentials({
    // ... existing credentials config
  }),
]
```

### User Creation Flow

When a user signs in with Google for the first time:

1. **signIn Callback**: Checks if the user exists in the database by email
2. If the user doesn't exist, creates a new user with:
   - `email`: From Google profile
   - `name`: From Google profile
   - `image`: From Google profile (optional)
   - `emailVerified`: Set to current date (OAuth users are pre-verified)
   - `isRoot`: Always `false` (PLAYER role)
   - `password`: `null` (OAuth users don't have passwords)

3. If the user exists, allows login and preserves existing role

### Security Model

#### Role Assignment

- **New Google Users**: Always created with `isRoot: false` (PLAYER role)
- **Existing Users**: Preserve their existing role (ROOT_ADMIN, ORGANIZATION_ADMIN, CLUB_ADMIN, or PLAYER)
- **Admin Rights**: Never granted automatically via Google OAuth

#### Email Validation

- Users without an email address are rejected during the sign-in process
- Email addresses are used as the unique identifier to match existing users

### JWT and Session

The JWT callback fetches the latest user data from the database for OAuth users:

```typescript
async jwt({ token, user, account, trigger }) {
  if (account?.provider === "google" || trigger === "signIn") {
    const dbUser = await prisma.user.findUnique({
      where: { email: token.email },
      select: { id: true, isRoot: true },
    });
    
    if (dbUser) {
      token.id = dbUser.id;
      token.isRoot = dbUser.isRoot;
    }
  }
  return token;
}
```

## Frontend Integration

### Google Login Button

The `GoogleLoginButton` component is reusable and styled with the project's dark theme:

```typescript
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";

<GoogleLoginButton callbackUrl="/dashboard" />
```

### Pages

The Google login button is available on:
- `/auth/sign-in` - Sign In page
- `/auth/sign-up` - Sign Up page

### Styling

The button uses the `im-btn-google` class with semantic styling that adapts to the theme:

- Light theme: White background with subtle border
- Dark theme: Semi-transparent background with enhanced border

## User Store Integration

The existing Zustand `useUserStore` works seamlessly with Google OAuth users:

- `loadUser()`: Fetches user data from `/api/me` endpoint
- Role-based checks: `hasRole()`, `hasAnyRole()`, `isAdmin()`, etc.
- No changes required to support OAuth users

## Middleware Integration

The existing middleware in `middleware.ts` works seamlessly with OAuth users:

- OAuth users are authenticated via NextAuth session
- Role-based redirects work as expected
- No changes required to support OAuth users

## Testing

### Test Coverage

The OAuth integration includes comprehensive tests:

1. **New User Creation**: Verifies users are created with PLAYER role
2. **Existing User Login**: Ensures existing users can log in with Google
3. **Admin Rights**: Confirms admin rights are never granted automatically
4. **Email Validation**: Tests rejection when no email is provided
5. **JWT Callback**: Validates user data is included in tokens
6. **Session Callback**: Ensures session contains proper user data
7. **Admin Preservation**: Verifies existing admins keep their rights

Run tests with:
```bash
npm test google-oauth.test.ts
```

### Manual Testing

To test the OAuth flow manually:

1. Set up Google OAuth credentials in `.env`
2. Run the development server: `npm run dev`
3. Navigate to `/auth/sign-in` or `/auth/sign-up`
4. Click "Continue with Google"
5. Complete Google authentication
6. Verify:
   - New users are created in the database
   - Users are redirected to `/dashboard`
   - Role is set to PLAYER (check database or `/api/me` endpoint)

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure the redirect URI in Google Cloud Console matches your environment
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

2. **"User not created"**
   - Check database connection
   - Verify Prisma schema includes `Account` model
   - Check server logs for errors

3. **"Session not persisting"**
   - Ensure `NEXTAUTH_SECRET` is set in `.env`
   - Check that cookies are enabled in the browser

4. **"Admin rights granted automatically"**
   - This should never happen - review the `signIn` callback
   - Check the database for the user's `isRoot` value

## Database Schema

The existing Prisma schema already supports OAuth via the `Account` model:

```prisma
model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

No migration is required - the schema already supports OAuth providers.

## Translations

### Supported Languages

- English (`en.json`)
- Ukrainian (`uk.json`)

### Translation Keys

- `auth.continueWithGoogle`: Button text for Google sign-in
- `auth.signingInWithGoogle`: Loading state text
- `auth.orContinueWith`: Divider text between credentials and OAuth

## Future Enhancements

Potential improvements for future versions:

1. Add more OAuth providers (GitHub, Facebook, etc.)
2. Allow users to link multiple OAuth accounts
3. Add OAuth account management page
4. Implement OAuth-specific error messages
5. Add analytics for OAuth sign-ins vs credentials

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth Google Provider](https://next-auth.js.org/providers/google)
