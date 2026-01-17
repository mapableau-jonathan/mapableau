# Passport.js Authentication Flow

## Overview

This document explains the complete Passport.js authentication flow for the ad.id unified identity provider system.

## Architecture

```
┌─────────────┐
│   Client    │
│  Service    │
└──────┬──────┘
       │
       │ 1. Redirect to OAuth
       │ GET /api/auth/identity-provider/[provider]?serviceId=...
       │
┌──────▼──────────────────────────────────────┐
│         ad.id Identity Provider            │
│  ┌──────────────────────────────────────┐  │
│  │   Passport.js Strategies              │  │
│  │  - JWT Strategy                       │  │
│  │  - Local Strategy                       │  │
│  │  - Google Strategy                   │  │
│  │  - Facebook Strategy                 │  │
│  │  - Microsoft Strategy                │  │
│  │  - Wix Strategy                      │  │
│  │  - SAML Strategy                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   Identity Provider Service          │  │
│  │  - initiateAuth()                    │  │
│  │  - handleCallback()                  │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   Profile Normalizer                 │  │
│  │  - normalizeProfile()                 │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   Account Linker                     │  │
│  │  - linkAccount()                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │   Token Issuance Service             │  │
│  │  - issueToken()                      │  │
│  └──────────────────────────────────────┘  │
└──────┬──────────────────────────────────────┘
       │
       │ 2. Redirect to Provider
       │
┌──────▼──────────────┐
│  OAuth Provider     │
│  (Google/Facebook/  │
│   Microsoft/Wix)    │
└──────┬──────────────┘
       │
       │ 3. User Authorizes
       │
       │ 4. Redirect with Code
       │ GET /api/auth/identity-provider/[provider]/callback?code=...&state=...
       │
┌──────▼──────────────────────────────────────┐
│         ad.id Identity Provider            │
│  ┌──────────────────────────────────────┐  │
│  │   Passport Strategy Callback          │  │
│  │  - Exchange code for tokens           │  │
│  │  - Get user profile                   │  │
│  │  - Normalize profile                 │  │
│  │  - Link/create account                │  │
│  │  - Issue JWT tokens                   │  │
│  └──────────────────────────────────────┘  │
└──────┬──────────────────────────────────────┘
       │
       │ 5. Redirect with Token
       │ GET /callback?token=...&serviceId=...
       │
┌──────▼──────┐
│   Client    │
│  Service    │
└─────────────┘
```

## Flow Steps

### Step 1: OAuth Initiation

**Client Service** redirects user to ad.id:
```
GET /api/auth/identity-provider/google?serviceId=mapable&callback=https://mapable.com.au/auth/callback
```

**ad.id Identity Provider Service**:
1. Validates `serviceId` against service registry
2. Generates secure state token with:
   - `serviceId`
   - `callbackUrl`
   - `nonce` (cryptographic random)
   - `timestamp`
3. Calls `initiateAuth(provider, serviceId, callbackUrl)`
4. Gets provider-specific OAuth URL
5. Redirects user to OAuth provider

**Code Path**:
```
app/api/auth/identity-provider/[provider]/route.ts
  → lib/services/auth/identity-provider-service.ts::initiateAuth()
  → getProviderAuthUrl() [generates OAuth URL]
  → Redirect to provider
```

### Step 2: User Authorization

**OAuth Provider** (Google/Facebook/Microsoft/Wix):
1. User sees consent screen
2. User authorizes application
3. Provider generates authorization code
4. Provider redirects back to ad.id callback URL

### Step 3: OAuth Callback

**OAuth Provider** redirects to:
```
GET /api/auth/identity-provider/google/callback?code=...&state=...
```

**ad.id Callback Handler**:
1. Validates state token (CSRF protection)
2. Extracts `serviceId` and `callbackUrl` from state
3. Calls `handleCallback(provider, code, state)`

**Code Path**:
```
app/api/auth/identity-provider/[provider]/callback/route.ts
  → lib/services/auth/identity-provider-service.ts::handleCallback()
```

### Step 4: Token Exchange

**Identity Provider Service**:
1. Calls `exchangeCodeForProfile(provider, code)`
2. Exchanges authorization code for access token
3. Fetches user profile from provider API
4. Returns normalized profile with tokens

**Provider-Specific Token Exchange**:

**Google**:
```typescript
POST https://oauth2.googleapis.com/token
  → GET https://www.googleapis.com/oauth2/v2/userinfo
```

**Facebook**:
```typescript
POST https://graph.facebook.com/v18.0/oauth/access_token
  → GET https://graph.facebook.com/v18.0/me?fields=id,name,email
```

**Microsoft**:
```typescript
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
  → GET https://graph.microsoft.com/v1.0/me
```

**Wix**:
```typescript
POST https://www.wix.com/oauth/access
  → GET https://www.wixapis.com/members/v1/members/current
```

### Step 5: Profile Normalization

**Profile Normalizer**:
1. Receives provider-specific profile
2. Calls `normalizeProfile(provider, profile)`
3. Returns consistent `NormalizedProfile`:
   ```typescript
   {
     provider: "google",
     providerAccountId: "123456789",
     email: "user@example.com",
     name: "User Name",
     image: "https://...",
     emailVerified: true,
     rawProfile: { ... }
   }
   ```

**Code Path**:
```
lib/services/auth/profile-normalizer.ts::normalizeProfile()
  → normalizeGoogleProfile() / normalizeFacebookProfile() / etc.
```

### Step 6: Account Linking

**Account Linker**:
1. Calls `linkAccount(normalizedProfile, requireEmailVerification)`
2. Checks if account exists for provider
3. If exists: Updates tokens
4. If not exists:
   - Finds user by email
   - If user exists: Links provider account
   - If user doesn't exist: Creates new user and account
5. Returns `AccountLinkResult`

**Code Path**:
```
lib/services/auth/account-linker.ts::linkAccount()
  → prisma.user.findUnique() / create() / update()
  → prisma.account.findUnique() / create() / update()
```

### Step 7: Service Link Creation

**Identity Provider Service**:
1. Calls `ensureServiceLink(userId, serviceId)`
2. Creates or updates `ServiceLink` record
3. Links user to requested service

**Code Path**:
```
lib/services/auth/identity-provider-service.ts::ensureServiceLink()
  → prisma.serviceLink.upsert()
```

### Step 8: Token Issuance

**Token Issuance Service**:
1. Calls `issueToken({ userId, serviceId, scopes })`
2. Validates service exists and is enabled
3. Validates user exists and is active
4. Validates scopes are allowed for service
5. Generates JWT token pair:
   - Access token (short-lived)
   - Refresh token (long-lived)
6. Stores token metadata (not tokens themselves)
7. Returns tokens

**Code Path**:
```
lib/services/auth/token-issuance-service.ts::issueToken()
  → lib/auth/jwt-service.ts::generateTokenPair()
  → jwt.sign() [creates JWT]
```

### Step 9: Redirect to Client

**Callback Handler**:
1. Builds callback URL with token
2. Sets HTTP-only cookies:
   - `access_token` (short-lived)
   - `refresh_token` (long-lived)
3. Redirects to client service callback URL

**Redirect**:
```
GET https://mapable.com.au/auth/callback?token=...&serviceId=mapable
```

### Step 10: Client Service Validation

**Client Service**:
1. Receives token in query parameter or cookie
2. Validates token via `/api/tokens/validate`
3. Creates local session
4. User is authenticated

## Passport.js Strategy Flow

### JWT Strategy

**Used for**: API token validation

**Flow**:
```
Request with Authorization: Bearer [token]
  → passport.authenticate('jwt')
  → JwtStrategy verifies token
  → Extracts user ID from payload
  → Queries database for user
  → Returns user object
```

**Configuration**:
```typescript
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
  issuer: "australian-disability-ltd",
  audience: "australian-disability-services"
}, async (payload, done) => {
  // Verify user exists
  // Return user
}));
```

### Local Strategy

**Used for**: Email/password authentication

**Flow**:
```
POST /api/auth/passport/login
  → passport.authenticate('local')
  → LocalStrategy verifies credentials
  → Returns user object
```

**Configuration**:
```typescript
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  // Find user by email
  // Verify password hash
  // Return user
}));
```

### OAuth Strategies (Google, Facebook, Microsoft, Wix)

**Used for**: OAuth 2.0 authentication

**Flow**:
```
1. Initiate: GET /api/auth/identity-provider/[provider]
   → Redirect to provider OAuth URL

2. Callback: GET /api/auth/identity-provider/[provider]/callback
   → passport.authenticate('[provider]')
   → Strategy exchanges code for tokens
   → Strategy fetches user profile
   → Strategy creates/updates user
   → Returns user object
```

**Configuration Example (Google)**:
```typescript
passport.use('google', new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/identity-provider/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Normalize profile
  // Link/create account
  // Return user
}));
```

## Token Lifecycle

### Access Token
- **Lifetime**: 15 minutes (configurable)
- **Storage**: HTTP-only cookie + query parameter
- **Usage**: API authentication
- **Refresh**: Via refresh token

### Refresh Token
- **Lifetime**: 7 days (configurable)
- **Storage**: HTTP-only cookie
- **Usage**: Obtain new access tokens
- **Revocation**: On logout or security event

### Token Validation Flow
```
Request with token
  → Extract token from header/cookie
  → Verify JWT signature
  → Check expiration
  → Check revocation list
  → Validate service access
  → Return user payload
```

## Security Features

### State Token Security
- Cryptographically secure random nonce
- Base64URL encoding
- Includes timestamp for expiration
- Validated on callback

### CSRF Protection
- State token prevents CSRF
- Callback URL validation
- Service ID validation

### Account Takeover Prevention
- Email verification required for linking
- Password verification for account changes
- Multiple provider linking with validation

### Token Security
- HTTP-only cookies (prevents XSS)
- Secure flag in production (HTTPS only)
- SameSite=lax (CSRF protection)
- Token encryption for sensitive providers (Wix)

## Error Handling

### OAuth Errors
- Provider errors → Redirect to login with error
- Invalid state → Redirect to login
- Token exchange failure → Log and redirect
- User fetch failure → Log and redirect

### Account Errors
- Email conflict → Link to existing account
- Account creation failure → Log and return error
- Service validation failure → Return error

### Token Errors
- Invalid token → 401 Unauthorized
- Expired token → 401 with refresh hint
- Revoked token → 401 Unauthorized
- Invalid service → 403 Forbidden

## Database Operations

### User Creation
```typescript
prisma.user.create({
  data: {
    email,
    name,
    image,
    emailVerified,
    accounts: { create: { ... } }
  }
})
```

### Account Linking
```typescript
prisma.account.create({
  data: {
    userId,
    provider,
    providerAccountId,
    access_token,
    refresh_token
  }
})
```

### Service Link Creation
```typescript
prisma.serviceLink.upsert({
  where: { userId_serviceType: { userId, serviceType } },
  create: { userId, serviceType, isActive: true },
  update: { isActive: true, lastAccessed: new Date() }
})
```

## Testing the Flow

### 1. Test OAuth Initiation
```bash
curl "https://ad.id/api/auth/identity-provider/google?serviceId=mapable"
# Should redirect to Google OAuth
```

### 2. Test Callback (with valid code)
```bash
# This requires actual OAuth flow
# Use browser to complete flow
```

### 3. Test Token Validation
```bash
curl -H "Authorization: Bearer [token]" \
  "https://ad.id/api/tokens/validate?serviceId=mapable"
```

### 4. Test User Info
```bash
curl -H "Authorization: Bearer [token]" \
  "https://ad.id/api/user-info/[userId]?serviceId=mapable"
```

## Configuration Files

### Passport Configuration
- `lib/auth/passport-config.ts` - All Passport strategies

### Service Configuration
- `lib/services/auth/service-registry.ts` - Service definitions
- `lib/services/auth/identity-provider-service.ts` - OAuth orchestration

### Token Configuration
- `lib/services/auth/token-issuance-service.ts` - Token generation
- `lib/auth/jwt-service.ts` - JWT utilities

### Environment Variables
- `lib/config/env.ts` - Environment validation

## Next Steps

1. **Configure OAuth Applications**: Set up in provider portals
2. **Test Each Provider**: Verify OAuth flows work
3. **Monitor Logs**: Check for errors in production
4. **Set Up Alerts**: Monitor authentication failures
5. **Document Client Integration**: Guide for client services
