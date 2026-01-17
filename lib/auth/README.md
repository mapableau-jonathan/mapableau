# Centralized Authentication System

A centralized authentication system for all Australian Disability Ltd services using Passport.js, JWT, and SSO.

## Features

- **JWT Authentication**: Secure token-based authentication
- **SSO Support**: Single Sign-On via OAuth2 and SAML
- **Multi-Service Access**: Centralized authentication across all services
- **Role-Based Access Control**: Service and role-based authorization
- **Token Refresh**: Automatic token refresh mechanism

## Architecture

```
lib/auth/
├── passport-config.ts    # Passport.js strategies configuration
├── jwt-service.ts        # JWT token generation and validation
├── sso-service.ts        # SSO session management
├── middleware.ts         # Authentication middleware
└── index.ts              # Main exports
```

## API Endpoints

### Authentication

- `POST /api/auth/passport/login` - Login with email/password
- `POST /api/auth/passport/logout` - Logout user
- `POST /api/auth/passport/refresh` - Refresh access token
- `GET /api/auth/passport/verify` - Verify JWT token

### SSO

- `GET /api/auth/sso/oauth2` - Initiate OAuth2 SSO
- `GET /api/auth/sso/oauth2/callback` - OAuth2 callback
- `GET /api/auth/sso/saml` - Initiate SAML SSO
- `POST /api/auth/sso/saml/callback` - SAML callback

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for token signing (min 32 chars)

### JWT Configuration (Optional)

- `JWT_SECRET` - JWT signing secret (defaults to NEXTAUTH_SECRET)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_ISSUER` - Token issuer (default: "australian-disability-ltd")
- `JWT_AUDIENCE` - Token audience (default: "australian-disability-services")
- `JWT_EXPIRES_IN` - Access token expiration (default: "15m")
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: "7d")

### OAuth2 SSO (Optional)

- `OAUTH2_CLIENT_ID` - OAuth2 client ID
- `OAUTH2_CLIENT_SECRET` - OAuth2 client secret
- `OAUTH2_AUTHORIZATION_URL` - OAuth2 authorization endpoint
- `OAUTH2_TOKEN_URL` - OAuth2 token endpoint
- `OAUTH2_CALLBACK_URL` - OAuth2 callback URL
- `OAUTH2_SCOPE` - OAuth2 scopes (comma-separated)

### SAML SSO (Optional)

- `SAML_ENTRY_POINT` - SAML IdP entry point URL
- `SAML_ISSUER` - SAML issuer identifier
- `SAML_CALLBACK_URL` - SAML callback URL
- `SAML_CERT` - SAML certificate
- `SAML_IDENTIFIER_FORMAT` - SAML identifier format
- `SAML_SIGNATURE_ALGORITHM` - Signature algorithm (default: "sha256")
- `SAML_WANT_ASSERTIONS_SIGNED` - Require signed assertions ("true"/"false")
- `SAML_WANT_MESSAGE_SIGNED` - Require signed messages ("true"/"false")

## Usage

### Server-Side (API Routes)

```typescript
import { withAuth, authenticate } from "@/lib/auth";

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

// Manual authentication check
export const GET = async (req: NextRequest) => {
  const authResult = authenticate(req);
  if (authResult.error) {
    return authResult.error;
  }
  const user = authResult.user;
  // ...
};
```

### Client-Side (React Hooks)

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

Service access is stored in the JWT token and validated by middleware.

## Security Features

- HTTP-only cookies for token storage (server-side)
- Secure token signing with HS256 algorithm
- Token expiration and refresh mechanism
- Role-based and service-based access control
- Rate limiting (via existing middleware)
- CSRF protection (via Next.js)

## Migration from NextAuth

This system can coexist with NextAuth. To migrate:

1. Update API routes to use `withAuth` middleware
2. Replace `useSession` with `usePassportAuth` in components
3. Update authentication calls to use new endpoints
4. Gradually migrate services one by one

## Testing

```typescript
// Example test
import { generateTokenPair, verifyToken } from "@/lib/auth/jwt-service";

const tokens = generateTokenPair({
  sub: "user-id",
  email: "user@example.com",
  role: "USER",
  serviceAccess: ["care"],
});

const payload = verifyToken(tokens.accessToken);
```
