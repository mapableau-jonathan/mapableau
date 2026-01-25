# NextAuth and Passport.js Integration

## Overview

This document describes the integration between NextAuth.js and Passport.js authentication systems in the MapAble platform. The integration allows using Passport.js strategies while maintaining NextAuth.js session management.

## Architecture

### Components

1. **NextAuth-Passport Bridge** (`lib/auth/nextauth-passport-bridge.ts`)
   - Converts Passport user profiles to NextAuth format
   - Handles user creation/linking from OAuth providers
   - Manages account linking between providers

2. **Unified Error Handler** (`lib/auth/error-handler.ts`)
   - Standardized error responses
   - Simplified error logging
   - Consistent error format across routes

3. **Passport Routes** (`app/api/auth/passport/`)
   - `/login` - Email/password authentication
   - `/google` - Google OAuth initiation
   - `/google/callback` - Google OAuth callback
   - `/facebook` - Facebook OAuth initiation
   - `/facebook/callback` - Facebook OAuth callback
   - `/verify` - JWT token verification
   - `/refresh` - Token refresh
   - `/logout` - User logout

## Flow

### OAuth Flow (Google/Facebook)

1. User clicks "Sign in with Google/Facebook"
2. Request goes to `/api/auth/passport/google` or `/api/auth/passport/facebook`
3. Passport initiates OAuth flow with provider
4. Provider redirects to `/api/auth/passport/google/callback` or `/api/auth/passport/facebook/callback`
5. Passport authenticates and returns user profile
6. Bridge service finds or creates user in database
7. Redirects to NextAuth callback to create session
8. User is logged in with NextAuth session

### Credentials Flow

1. User submits email/password to `/api/auth/passport/login`
2. Passport Local strategy validates credentials
3. Returns user data (client should call NextAuth signIn)
4. NextAuth creates session

## Error Handling

All authentication errors are handled through the unified error handler:

```typescript
import { createAuthErrorResponse, createAuthErrorRedirect } from "@/lib/auth/error-handler";

// For API responses
return createAuthErrorResponse(error, "Default message", 401);

// For redirects
return createAuthErrorRedirect(baseUrl, error, "Default message");
```

This ensures:
- Consistent error format
- Proper logging
- No sensitive data leakage
- Simplified error handling code

## Benefits

1. **Reduced Error Complexity**: Unified error handler eliminates repetitive try-catch blocks
2. **Better Logging**: Centralized logging with consistent format
3. **Flexibility**: Can use Passport strategies while maintaining NextAuth sessions
4. **Security**: Proper error messages without exposing sensitive information
5. **Maintainability**: Single source of truth for error handling

## Usage

### Client-Side OAuth

```typescript
// Redirect to Passport OAuth
window.location.href = "/api/auth/passport/google";
```

### Client-Side Login

```typescript
const response = await fetch("/api/auth/passport/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();
if (data.success) {
  // Sign in with NextAuth
  await signIn("credentials", {
    email,
    password,
    redirect: true,
    callbackUrl: data.callbackUrl,
  });
}
```

## Environment Variables

Required for OAuth providers:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com
```

## Next Steps

1. Test OAuth flows with Google and Facebook
2. Verify error handling in all scenarios
3. Add additional Passport strategies as needed
4. Monitor error logs for improvements
