# Unified Identity Provider System

## Overview

A comprehensive unified identity provider service for Australian Disability Ltd that supports Google Auth Platform, Facebook Login, Microsoft Entra ID, and Wix OAuth. The system serves user information to MediaWiki and Cursor/Replit applications, along with AccessiBooks, Disapedia, and MapAble.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Services                           │
│  MapAble | AccessiBooks | Disapedia | MediaWiki | Cursor    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ OAuth Initiate / User Info Request
                     │
┌────────────────────▼────────────────────────────────────────┐
│              ad.id Identity Provider                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Identity Provider Service                    │  │
│  │  - Google | Facebook | Microsoft | Wix              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Token Issuance Service                       │  │
│  │  - Service Validation | Token Generation             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         User Data Manager                           │  │
│  │  - Field-level Access Control | Encryption           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Wix User Sync                                │  │
│  │  - Periodic Sync | Token Refresh                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Data Access
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Data Layer (Prisma/PostgreSQL)                 │
│  - User Model | Account Model | ServiceLink Model           │
└─────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. Service Registry (`lib/services/auth/service-registry.ts`)
- Manages configuration for all services
- Validates service credentials
- Manages service-specific scopes and permissions

### 2. Identity Provider Service (`lib/services/auth/identity-provider-service.ts`)
- Unified interface for all OAuth providers
- Handles OAuth initiation and callbacks
- Manages account linking and user creation

### 3. Profile Normalizer (`lib/services/auth/profile-normalizer.ts`)
- Normalizes profiles from different providers to consistent format
- Handles Google, Facebook, Microsoft, Wix, and generic OAuth2

### 4. Account Linker (`lib/services/auth/account-linker.ts`)
- Links multiple OAuth providers to same user account
- Prevents account takeover attacks
- Handles email conflicts

### 5. Token Issuance Service (`lib/services/auth/token-issuance-service.ts`)
- Centralized JWT token issuance
- Service validation and authorization
- Scope management

### 6. Token Lifecycle Manager (`lib/services/auth/token-lifecycle-manager.ts`)
- Token expiration management
- Token revocation
- Token rotation
- Cleanup jobs

### 7. User Data Manager (`lib/services/auth/user-data-manager.ts`)
- Centralized user data management
- Field-level access control
- Data encryption at rest
- GDPR compliance

### 8. Wix User Sync (`lib/services/auth/wix-user-sync.ts`)
- Retrieves user data from Wix API
- Handles token refresh
- Periodic synchronization

### 9. User Info Service (`lib/services/auth/user-info-service.ts`)
- Provides user information to client services
- MediaWiki-compatible format
- Batch user information

### 10. MediaWiki Integration (`lib/services/auth/mediawiki-integration.ts`)
- OAuth 2.0 extension compatibility
- User synchronization
- Session management

## API Endpoints

### Identity Provider Routes

#### Initiate OAuth
```
GET /api/auth/identity-provider/[provider]?serviceId=[service]&callback=[url]
```
Providers: `google`, `facebook`, `microsoft`, `wix`

#### OAuth Callback
```
GET /api/auth/identity-provider/[provider]/callback?code=[code]&state=[state]
```

### Token Management

#### Issue Token
```
POST /api/tokens/issue
Body: { userId, serviceId, scopes, expiresIn, clientId, clientSecret }
```

#### Validate Token
```
GET /api/tokens/validate?serviceId=[service]
Headers: Authorization: Bearer [token]
```

#### Revoke Token
```
POST /api/tokens/revoke
Body: { tokenId, serviceId }
```

### User Information

#### Get User Info
```
GET /api/user-info/[userId]?fields=[fields]&format=[json|mediawiki]&serviceId=[service]
Headers: Authorization: Bearer [token]
```

#### Batch User Info
```
POST /api/user-info/batch
Body: { userIds: [], fields: [] }
Headers: Authorization: Bearer [token]
```

## Authentication Flow

### Example: User authenticating to MapAble via Google

1. User clicks "Sign in with Google" on MapAble
2. MapAble redirects to: `https://ad.id/api/auth/identity-provider/google?serviceId=mapable&callback=https://mapable.com.au/auth/callback`
3. ad.id generates secure state token with serviceId and callback URL
4. User redirected to Google OAuth consent screen
5. User authorizes, Google redirects to: `https://ad.id/api/auth/identity-provider/google/callback?code=...&state=...`
6. ad.id:
   - Validates state token
   - Exchanges code for access token
   - Normalizes user profile
   - Creates/updates User and Account records
   - Creates ServiceLink record
   - Generates service-specific JWT token
7. ad.id redirects to: `https://mapable.com.au/auth/callback?token=...&serviceId=mapable`
8. MapAble validates token and creates local session

## Wix User Data Synchronization

1. User authenticates via Wix OAuth
2. ad.id stores encrypted Wix access token
3. Wix user sync service retrieves user data from Wix API
4. User data synced to Prisma User model
5. MediaWiki/Cursor applications request user info via API
6. User info API returns synced data

## Security Features

- **State Parameter**: Cryptographically secure state tokens with nonce
- **Service Validation**: Validate serviceId and callback URLs
- **Email Verification**: Verify email ownership when linking accounts
- **Account Takeover Prevention**: Require verification before linking
- **Token Encryption**: Encrypt Wix tokens in database
- **Field-Level Access Control**: Services only see authorized fields
- **Data Encryption**: Encrypt sensitive data at rest
- **Token Revocation**: Immediate revocation support
- **Audit Logging**: All operations logged

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-min-32-chars
```

### Identity Providers
```env
# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Facebook
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

# Microsoft
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...

# Wix
WIX_CLIENT_ID=...
WIX_CLIENT_SECRET=...
WIX_APP_ID=...
```

### Service Configuration
```env
AD_ID_DOMAIN=https://ad.id
MAPABLE_CALLBACK_URL=https://mapable.com.au/auth/callback
ACCESSIBOOKS_CALLBACK_URL=https://accessibooks.com.au/auth/callback
DISAPEDIA_CALLBACK_URL=https://disapedia.au/auth/callback
MEDIAWIKI_CALLBACK_URL=https://ad.id/api/auth/callback/mediawiki
CURSOR_REPLIT_CALLBACK_URL=https://ad.id/api/auth/callback/cursor-replit
```

### Security
```env
DATA_ENCRYPTION_KEY=your-encryption-key-32-chars
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## Files Created

### Core Services
- `lib/services/auth/service-registry.ts`
- `lib/services/auth/identity-provider-service.ts`
- `lib/services/auth/profile-normalizer.ts`
- `lib/services/auth/account-linker.ts`
- `lib/services/auth/token-issuance-service.ts`
- `lib/services/auth/token-lifecycle-manager.ts`
- `lib/services/auth/user-data-manager.ts`
- `lib/services/auth/wix-user-sync.ts`
- `lib/services/auth/user-info-service.ts`
- `lib/services/auth/mediawiki-integration.ts`

### API Routes
- `app/api/auth/identity-provider/[provider]/route.ts`
- `app/api/auth/identity-provider/[provider]/callback/route.ts`
- `app/api/tokens/issue/route.ts`
- `app/api/tokens/validate/route.ts`
- `app/api/tokens/revoke/route.ts`
- `app/api/user-info/[userId]/route.ts`
- `app/api/user-info/batch/route.ts`

### Updated Files
- `lib/auth/passport-config.ts` - Added Wix strategy
- `lib/config/env.ts` - Added all required environment variables

## Usage Examples

### Initiate OAuth
```typescript
// Redirect user to Google OAuth for MapAble
window.location.href = '/api/auth/identity-provider/google?serviceId=mapable';
```

### Get User Info (MediaWiki)
```typescript
const response = await fetch('/api/user-info/[userId]?format=mediawiki&serviceId=mediawiki', {
  headers: { Authorization: `Bearer ${token}` }
});
const userInfo = await response.json();
```

### Issue Token (Service)
```typescript
const response = await fetch('/api/tokens/issue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    serviceId: 'mapable',
    scopes: ['read:profile', 'read:email'],
    clientId: 'service-client-id',
    clientSecret: 'service-client-secret'
  })
});
```

## Next Steps

1. Configure OAuth applications in provider portals
2. Set callback URLs in provider settings
3. Add environment variables
4. Test each provider flow
5. Configure Wix app and test user sync
6. Set up MediaWiki OAuth extension
7. Test user info API with MediaWiki and Cursor
8. Set up periodic Wix sync job (cron)
9. Configure data encryption keys
10. Test cross-service authentication
