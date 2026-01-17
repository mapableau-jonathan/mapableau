# Centralized Authentication System - Implementation Summary

## Overview

A comprehensive centralized authentication system has been created for all Australian Disability Ltd services using **Passport.js**, **JWT**, and **SSO** (Single Sign-On). This system provides secure, scalable authentication across all services.

## What Was Created

### 1. Core Authentication Library (`lib/auth/`)

- **`passport-config.ts`**: Passport.js strategy configurations (JWT, Local, OAuth2, SAML)
- **`passport-adapter.ts`**: Next.js-compatible adapter for Passport strategies
- **`jwt-service.ts`**: JWT token generation, validation, and refresh
- **`sso-service.ts`**: SSO session management and service access control
- **`middleware.ts`**: Authentication middleware for protecting API routes
- **`index.ts`**: Main export file

### 2. API Endpoints (`app/api/auth/`)

#### Passport Authentication
- `POST /api/auth/passport/login` - Email/password login
- `POST /api/auth/passport/logout` - User logout
- `POST /api/auth/passport/refresh` - Refresh access token
- `GET /api/auth/passport/verify` - Verify JWT token

#### SSO Endpoints
- `GET /api/auth/sso/oauth2` - Initiate OAuth2 SSO
- `GET /api/auth/sso/oauth2/callback` - OAuth2 callback handler
- `GET /api/auth/sso/saml` - Initiate SAML SSO
- `POST /api/auth/sso/saml/callback` - SAML callback handler

### 3. Client-Side Hook (`hooks/use-passport-auth.ts`)

React hook for client-side authentication:
- `usePassportAuth()` - Main authentication hook
- `getAccessToken()` - Get stored access token
- `authenticatedFetch()` - Make authenticated API calls

### 4. Configuration Updates

- **`package.json`**: Added Passport.js and JWT dependencies
- **`lib/config/env.ts`**: Added environment variable validation for JWT and SSO

### 5. Documentation

- **`lib/auth/README.md`**: Comprehensive documentation

## Features

### ✅ JWT Authentication
- Secure token-based authentication
- Access and refresh token pairs
- Configurable token expiration
- Token verification and validation

### ✅ SSO Support
- **OAuth2**: Standard OAuth2 flow for enterprise SSO
- **SAML**: SAML 2.0 support for enterprise authentication
- Automatic user provisioning
- Account linking

### ✅ Multi-Service Access Control
- Service-specific access tokens
- Role-based authorization
- Service access validation
- Centralized service management

### ✅ Security Features
- HTTP-only cookies for token storage
- Secure token signing (HS256)
- Token refresh mechanism
- CSRF protection
- Rate limiting integration

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-min-32-chars
```

### JWT Configuration (Optional)
```env
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ISSUER=australian-disability-ltd
JWT_AUDIENCE=australian-disability-services
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### OAuth2 SSO (Optional)
```env
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret
OAUTH2_AUTHORIZATION_URL=https://oauth-provider.com/authorize
OAUTH2_TOKEN_URL=https://oauth-provider.com/token
OAUTH2_CALLBACK_URL=https://your-domain.com/api/auth/sso/oauth2/callback
OAUTH2_USERINFO_URL=https://oauth-provider.com/userinfo
OAUTH2_SCOPE=openid,profile,email
```

### SAML SSO (Optional)
```env
SAML_ENTRY_POINT=https://saml-idp.com/sso
SAML_ISSUER=your-saml-issuer
SAML_CALLBACK_URL=https://your-domain.com/api/auth/sso/saml/callback
SAML_CERT=-----BEGIN CERTIFICATE-----...
SAML_IDENTIFIER_FORMAT=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
SAML_SIGNATURE_ALGORITHM=sha256
SAML_WANT_ASSERTIONS_SIGNED=true
SAML_WANT_MESSAGE_SIGNED=true
```

## Usage Examples

### Server-Side (API Routes)

```typescript
import { withAuth } from "@/lib/auth";

// Protect a route
export const GET = withAuth(async (req) => {
  const user = req.user; // Authenticated user
  return NextResponse.json({ user });
});

// With role/service restrictions
export const GET = withAuth(
  async (req) => {
    return NextResponse.json({ data: "protected" });
  },
  {
    allowedRoles: ["NDIA_ADMIN"],
    allowedServices: ["compliance"],
  }
);
```

### Client-Side (React)

```typescript
import { usePassportAuth } from "@/hooks/use-passport-auth";

function MyComponent() {
  const { user, login, logout, isAuthenticated } = usePassportAuth();

  const handleLogin = async () => {
    const result = await login("user@example.com", "password");
    if (result.success) {
      // Redirect or update UI
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Authenticated API Calls

```typescript
import { authenticatedFetch } from "@/hooks/use-passport-auth";

const response = await authenticatedFetch("/api/protected-endpoint", {
  method: "POST",
  body: JSON.stringify({ data: "value" }),
});
```

## Service Access

Users can be granted access to specific services:
- `care` - Care services
- `transport` - Transport services
- `jobs` - Job services
- `marketplace` - Marketplace services
- `abilitypay` - AbilityPay services
- `compliance` - Compliance services
- `all` - Access to all services (admin)

## Integration with Existing System

This authentication system can **coexist** with the existing NextAuth system. You can:

1. Gradually migrate services to use the new authentication
2. Use both systems side-by-side during transition
3. Keep NextAuth for existing features while using Passport for new services

## Next Steps

1. **Configure Environment Variables**: Add JWT and SSO configuration to your `.env` file
2. **Test Authentication**: Test login/logout flows
3. **Configure SSO Providers**: Set up OAuth2 or SAML providers if needed
4. **Migrate Services**: Gradually migrate services to use the new authentication
5. **Update Frontend**: Replace `useSession` with `usePassportAuth` in components

## Dependencies Installed

- `passport` - Authentication middleware
- `passport-jwt` - JWT strategy
- `passport-local` - Local (email/password) strategy
- `passport-oauth2` - OAuth2 strategy
- `passport-saml` - SAML strategy
- `jsonwebtoken` - JWT token handling
- `express-session` - Session management
- `connect-redis` - Redis session store (optional)
- Type definitions for all packages

## Files Created/Modified

### Created
- `lib/auth/passport-config.ts`
- `lib/auth/passport-adapter.ts`
- `lib/auth/jwt-service.ts`
- `lib/auth/sso-service.ts`
- `lib/auth/middleware.ts`
- `lib/auth/index.ts`
- `lib/auth/README.md`
- `app/api/auth/passport/login/route.ts`
- `app/api/auth/passport/logout/route.ts`
- `app/api/auth/passport/refresh/route.ts`
- `app/api/auth/passport/verify/route.ts`
- `app/api/auth/sso/oauth2/route.ts`
- `app/api/auth/sso/oauth2/callback/route.ts`
- `app/api/auth/sso/saml/route.ts`
- `app/api/auth/sso/saml/callback/route.ts`
- `hooks/use-passport-auth.ts`

### Modified
- `package.json` - Added dependencies
- `lib/config/env.ts` - Added environment variable validation

## Support

For detailed documentation, see `lib/auth/README.md`.

For questions or issues, refer to the code comments in each file.
