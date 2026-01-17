# Authentication System Update - Identity Providers

## New Features Added

### 1. Identity Provider Support

Added support for multiple identity providers with dedicated endpoints:

#### Google OAuth
- `GET /api/auth/identity-provider/google` - Initiate Google SSO
- `GET /api/auth/identity-provider/google/callback` - Google callback handler

#### Facebook OAuth
- `GET /api/auth/identity-provider/facebook` - Initiate Facebook SSO
- `GET /api/auth/identity-provider/facebook/callback` - Facebook callback handler

#### Microsoft Entra ID (Azure AD)
- `GET /api/auth/identity-provider/microsoft` - Initiate Microsoft SSO
- `GET /api/auth/identity-provider/microsoft/callback` - Microsoft callback handler

### 2. Identity Provider Discovery

- `GET /api/auth/identity-provider/list` - Returns list of available identity providers

This endpoint dynamically lists all configured identity providers based on environment variables.

### 3. Service-Specific Callback URLs

Added support for service-specific callback URLs for different Australian Disability Ltd services:

- **Mapable**: `MAPABLE_CALLBACK_URL` (default: `https://mapable.com.au/auth/callback`)
- **AccessiBooks**: `ACCESSIBOOKS_CALLBACK_URL` (default: `https://accessibooks.com.au/auth/callback`)
- **Disapedia**: `DISAPEDIA_CALLBACK_URL` (default: `https://disapedia.au/auth/callback`)
- **MediaWiki**: `MEDIAWIKI_CALLBACK_URL`
- **Cursor/Replit**: `CURSOR_REPLIT_CALLBACK_URL`

### 4. Service Callback Management

New utility module `lib/auth/service-callbacks.ts` provides:

- `getServiceCallbackUrl()` - Get callback URL for a specific service
- `getIdentityProviderCallbackUrl()` - Get identity provider callback with service redirect
- `parseServiceCallback()` - Parse service callback from request

## Updated Passport Configuration

The `passport-config.ts` has been enhanced with:

1. **Google Strategy** - Using `passport-google-oauth20`
2. **Facebook Strategy** - Using `passport-facebook`
3. **Microsoft Entra ID Strategy** - Using OAuth2Strategy with Microsoft Graph API integration

All strategies:
- Automatically create or link user accounts
- Store OAuth tokens in the database
- Generate JWT tokens after successful authentication
- Support service-specific redirects

## Usage Examples

### Initiate Google SSO

```typescript
// Redirect user to Google OAuth
window.location.href = '/api/auth/identity-provider/google?callback=/dashboard';
```

### Initiate SSO for Specific Service

```typescript
// Redirect to Google SSO, then redirect to Mapable after authentication
window.location.href = '/api/auth/identity-provider/google?service=mapable';
```

### List Available Providers

```typescript
const response = await fetch('/api/auth/identity-provider/list');
const { providers } = await response.json();

// providers: [
//   { id: 'google', name: 'Google', enabled: true, authUrl: '...' },
//   { id: 'facebook', name: 'Facebook', enabled: true, authUrl: '...' },
//   { id: 'microsoft', name: 'Microsoft', enabled: true, authUrl: '...' }
// ]
```

### Service Callback URLs

```typescript
import { getServiceCallbackUrl, getIdentityProviderCallbackUrl } from '@/lib/auth/service-callbacks';

// Get callback URL for Mapable service
const mapableCallback = getServiceCallbackUrl('mapable', 'google');
// Returns: https://mapable.com.au/auth/callback?provider=google

// Get identity provider callback with service redirect
const googleCallback = getIdentityProviderCallbackUrl('google', 'mapable');
// Returns: /api/auth/identity-provider/google/callback?service=mapable&serviceCallback=...
```

## Environment Variables

### Required for Google
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Required for Facebook
```env
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

### Required for Microsoft
```env
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

### Optional Service Configuration
```env
AD_ID_DOMAIN=https://ad.id  # Base domain for identity provider
MAPABLE_CALLBACK_URL=https://mapable.com.au/auth/callback
ACCESSIBOOKS_CALLBACK_URL=https://accessibooks.com.au/auth/callback
DISAPEDIA_CALLBACK_URL=https://disapedia.au/auth/callback
```

## Callback Flow

1. User clicks "Sign in with Google/Facebook/Microsoft"
2. Redirected to identity provider
3. User authenticates with provider
4. Provider redirects to callback endpoint
5. System:
   - Creates/links user account
   - Generates JWT tokens
   - Stores tokens in HTTP-only cookies
   - Redirects to service-specific callback URL (if specified)
   - Or redirects to default dashboard

## Security Features

- All OAuth tokens stored securely in database
- JWT tokens in HTTP-only cookies
- Service-specific redirects validated
- State parameter for CSRF protection
- Automatic account linking for existing users

## Files Created

- `app/api/auth/identity-provider/google/route.ts`
- `app/api/auth/identity-provider/google/callback/route.ts`
- `app/api/auth/identity-provider/facebook/route.ts`
- `app/api/auth/identity-provider/facebook/callback/route.ts`
- `app/api/auth/identity-provider/microsoft/route.ts`
- `app/api/auth/identity-provider/microsoft/callback/route.ts`
- `app/api/auth/identity-provider/list/route.ts`
- `lib/auth/service-callbacks.ts`

## Files Updated

- `lib/auth/passport-config.ts` - Added Google, Facebook, Microsoft strategies
- `lib/config/env.ts` - Added service callback URL environment variables
- `lib/auth/index.ts` - Exported service-callbacks module
- `lib/auth/README.md` - Updated documentation

## Next Steps

1. Configure OAuth applications in Google, Facebook, and Microsoft portals
2. Set callback URLs in OAuth provider settings:
   - Google: `https://your-domain.com/api/auth/identity-provider/google/callback`
   - Facebook: `https://your-domain.com/api/auth/identity-provider/facebook/callback`
   - Microsoft: `https://your-domain.com/api/auth/identity-provider/microsoft/callback`
3. Add environment variables to your `.env` file
4. Test each identity provider flow
5. Configure service-specific callback URLs as needed
