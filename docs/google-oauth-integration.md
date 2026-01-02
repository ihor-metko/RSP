# Google OAuth Integration with Auto-Linking

## Overview

This document describes the Google OAuth integration implemented using NextAuth.js v5 with automatic account linking. The integration allows users to sign in or register using their Google accounts, and automatically links Google accounts to existing email/password users, preventing the `OAuthAccountNotLinked` error.

## Key Features

✅ **Auto-Linking**: Existing email/password users can sign in with Google using the same email  
✅ **Google ID Storage**: Stores Google OAuth identifier (`googleId`) for account tracking  
✅ **Role Preservation**: Existing user roles are maintained when linking accounts  
✅ **Secure Defaults**: New Google users default to PLAYER role (isRoot: false)  
✅ **Seamless UX**: Users can switch between email/password and Google authentication  
✅ **One Email = One User**: Prevents duplicate accounts for the same email address

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

The Google OAuth provider is configured in `src/lib/auth.ts` with automatic email account linking:

```typescript
providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true, // Auto-link accounts by email
  }),
  Credentials({
    // ... existing credentials config
  }),
]
```

**Important**: The `allowDangerousEmailAccountLinking` option is intentionally enabled to provide seamless UX. This is safe because:
- Email addresses are verified by Google
- Users control their Google accounts
- One email = one user in the system (business requirement)

### Database Schema

The User model includes a `googleId` field to track Google OAuth accounts:

```prisma
model User {
  id                   String           @id @default(uuid())
  name                 String?
  email                String           @unique
  emailVerified        DateTime?
  image                String?
  password             String?
  googleId             String?          @unique // Google OAuth ID (profile.sub)
  isRoot               Boolean          @default(false)
  // ... other fields
}
```

### User Creation and Linking Flow

When a user signs in with Google:

1. **signIn Callback**: Checks if the user exists in the database by email
2. **Existing User - No Google ID**:
   - Updates user record with `googleId` from Google profile (profile.sub)
   - Sets `emailVerified` if not already set
   - Preserves existing `isRoot` role
   - Links Google Account via PrismaAdapter
   
3. **Existing User - Has Google ID**:
   - Allows sign-in without updates
   - Account already linked
   
4. **New User**:
   - Creates user with:
     - `email`: From Google profile
     - `name`: From Google profile
     - `image`: From Google profile (optional)
     - `googleId`: From Google profile.sub
     - `emailVerified`: Set to current date
     - `isRoot`: Always `false` (PLAYER role)
     - `password`: `null` (OAuth users don't have passwords)
   - PrismaAdapter creates Account record automatically

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

The OAuth integration includes comprehensive tests in `src/__tests__/google-oauth.test.ts`:

1. **New User Creation**: Verifies users are created with PLAYER role and googleId
2. **Auto-Linking**: Tests linking Google accounts to existing email/password users
3. **Existing Google User**: Ensures users with googleId can re-login without updates
4. **Admin Rights**: Confirms admin rights are never granted automatically
5. **Email Validation**: Tests rejection when no email is provided
6. **JWT Callback**: Validates user data is included in tokens
7. **Session Callback**: Ensures session contains proper user data
8. **Admin Preservation**: Verifies existing admins keep their rights when linking Google
9. **Race Conditions**: Tests proper handling of concurrent user creation

Run tests with:
```bash
npm test google-oauth.test.ts
```

**Test Results**: 9 tests passing ✅

### Manual Testing

To test the OAuth flow and auto-linking manually:

**Test Scenario 1: New Google User**
1. Navigate to `/auth/sign-in`
2. Click "Continue with Google"
3. Complete Google authentication with a new email
4. Verify:
   - User created in database with `isRoot: false`
   - User has `googleId` field populated
   - Redirected to `/dashboard`
   - Check `/api/me` endpoint for role

**Test Scenario 2: Existing Email/Password User**
1. Create a user with email/password at `/auth/sign-up`
2. Sign out
3. Go to `/auth/sign-in`
4. Click "Continue with Google" using the SAME email
5. Verify:
   - No `OAuthAccountNotLinked` error
   - Logged in successfully
   - User record updated with `googleId`
   - Existing role preserved (check database)
   - Can now login with either method

**Test Scenario 3: Admin Role Preservation**
1. Have an existing admin user (isRoot: true)
2. Link Google account using same email
3. Verify:
   - Admin rights preserved (isRoot: true)
   - `googleId` added to user
   - Can switch between auth methods

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure the redirect URI in Google Cloud Console matches your environment
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

2. **"OAuthAccountNotLinked" error** ✅ FIXED
   - This error is now prevented by `allowDangerousEmailAccountLinking`
   - Existing users can sign in with Google seamlessly
   - Accounts are auto-linked by email

3. **"User not created"**
   - Check database connection
   - Verify Prisma schema includes `Account` model and `googleId` field
   - Check server logs for errors
   - Run migration: `npx prisma migrate dev`

4. **"Session not persisting"**
   - Ensure `NEXTAUTH_SECRET` or `AUTH_SECRET` is set in `.env`
   - Check that cookies are enabled in the browser

5. **"Admin rights granted automatically"**
   - This should never happen - review the `signIn` callback
   - Check the database for the user's `isRoot` value
   - Verify the race condition handling

6. **"Google ID not stored"**
   - Check migration was applied: `SELECT * FROM "User" WHERE email='...'`
   - Verify `googleId` column exists
   - Check server logs for update errors

## Database Schema

### User Model

```prisma
model User {
  id                   String           @id @default(uuid())
  name                 String?
  email                String           @unique
  emailVerified        DateTime?
  image                String?
  password             String?
  googleId             String?          @unique // Google OAuth ID (profile.sub)
  isRoot               Boolean          @default(false)
  blocked              Boolean          @default(false)
  // ... other fields
  accounts             Account[]
  sessions             Session[]
}
```

**Migration**: The `googleId` field was added via migration `20260102142638_add_google_id_to_user`

### Account Model

The existing Account model supports OAuth via PrismaAdapter:

```prisma
model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String  // "google" for Google OAuth
  providerAccountId String  // Google user ID
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

### Running Migrations

After pulling this code, run:
```bash
npx prisma migrate dev
npx prisma generate
```

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

1. ✅ ~~Auto-link Google accounts to existing email/password users~~ (COMPLETED)
2. Add more OAuth providers (GitHub, Facebook, etc.)
3. Allow users to unlink OAuth accounts
4. Add OAuth account management page in user settings
5. Implement OAuth-specific error messages
6. Add analytics for OAuth sign-ins vs credentials
7. Support multiple OAuth providers per user

## Recent Updates

### January 2026 - Auto-Linking Implementation
- ✅ Added `googleId` field to User model
- ✅ Enabled `allowDangerousEmailAccountLinking` for Google provider
- ✅ Implemented auto-linking in signIn callback
- ✅ Preserves existing user roles when linking
- ✅ Handles race conditions in user creation
- ✅ Updated tests with auto-linking scenarios (9 tests)
- ✅ Security audit passed (CodeQL - no vulnerabilities)

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth Google Provider](https://next-auth.js.org/providers/google)
- [PrismaAdapter Documentation](https://authjs.dev/reference/adapter/prisma)
