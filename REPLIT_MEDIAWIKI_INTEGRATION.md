# Replit and MediaWiki Integration

## Overview

Complete integration with Replit Auth and MediaWiki OAuth 2.0 extension for the ad.id identity provider system.

## Replit Integration

### Features

- OAuth 2.0 authentication flow
- User account creation and linking
- Token management (access and refresh tokens)
- Service-specific token issuance
- Automatic service link creation

### API Endpoints

#### Initiate Replit OAuth
```
GET /api/auth/replit?serviceId=[service]&callback=[url]
```

#### Replit OAuth Callback
```
GET /api/auth/replit/callback?code=[code]&state=[state]
```

### Authentication Flow

1. User clicks "Sign in with Replit" on client service
2. Client redirects to: `https://ad.id/api/auth/replit?serviceId=cursor-replit`
3. ad.id generates secure state token and redirects to Replit OAuth
4. User authorizes on Replit
5. Replit redirects to: `https://ad.id/api/auth/replit/callback?code=...&state=...`
6. ad.id:
   - Exchanges code for access token
   - Fetches user information from Replit API
   - Creates/updates user account
   - Links Replit account
   - Creates service link for cursor-replit
   - Issues service-specific JWT token
7. ad.id redirects to client callback URL with token

### Environment Variables

```env
REPLIT_CLIENT_ID=your-replit-client-id
REPLIT_CLIENT_SECRET=your-replit-client-secret
CURSOR_REPLIT_CALLBACK_URL=https://ad.id/api/auth/replit/callback
```

### Replit API Integration

The service integrates with:
- `https://replit.com/api/oauth2/authorize` - OAuth authorization
- `https://replit.com/api/oauth2/token` - Token exchange
- `https://replit.com/api/users/@me` - User information

## MediaWiki Integration

### Features

- OAuth 1.0a authentication (MediaWiki OAuth extension)
- User account creation via MediaWiki API
- User information synchronization
- MediaWiki-compatible user data format
- Automatic account linking

### API Endpoints

#### Initiate MediaWiki OAuth
```
GET /api/auth/mediawiki?serviceId=[service]&callback=[url]
```

#### MediaWiki OAuth Callback
```
GET /api/auth/mediawiki/callback?oauth_token=[token]&oauth_verifier=[verifier]&state=[state]
```

### Authentication Flow

1. User clicks "Sign in with MediaWiki" or accesses MediaWiki
2. MediaWiki redirects to: `https://ad.id/api/auth/mediawiki?serviceId=mediawiki`
3. ad.id generates secure state token and redirects to MediaWiki OAuth
4. User authorizes on MediaWiki
5. MediaWiki redirects to: `https://ad.id/api/auth/mediawiki/callback?oauth_token=...&oauth_verifier=...&state=...`
6. ad.id:
   - Exchanges OAuth token for access token/secret
   - Fetches user information from MediaWiki API
   - Creates/updates user account
   - Links MediaWiki account
   - Syncs user to MediaWiki (creates MediaWiki account if needed)
   - Issues service-specific JWT token
7. ad.id redirects to client callback URL with token

### Environment Variables

```env
MEDIAWIKI_API_URL=https://your-wiki.com
MEDIAWIKI_CONSUMER_KEY=your-consumer-key
MEDIAWIKI_CONSUMER_SECRET=your-consumer-secret
MEDIAWIKI_CALLBACK_URL=https://ad.id/api/auth/mediawiki/callback
```

### MediaWiki API Integration

The service integrates with:
- `Special:OAuth/authorize` - OAuth authorization
- `Special:OAuth/token` - Token exchange
- `api.php?action=query&meta=userinfo` - User information
- `api.php?action=createaccount` - User creation
- `api.php?action=edit` - User updates

### MediaWiki OAuth Extension Setup

1. Install MediaWiki OAuth extension
2. Register OAuth consumer in MediaWiki
3. Configure callback URL: `https://ad.id/api/auth/mediawiki/callback`
4. Set consumer key and secret in environment variables

## User Information API

Both Replit and MediaWiki users can access their information via:

```
GET /api/user-info/[userId]?format=[json|mediawiki]&serviceId=[service]
Headers: Authorization: Bearer [token]
```

### MediaWiki Format

When `format=mediawiki`, the API returns:
```json
{
  "username": "user@example.com",
  "email": "user@example.com",
  "realname": "User Name",
  "groups": ["user"]
}
```

## Service Integration

### Replit Applications

Replit applications can:
1. Redirect users to ad.id for authentication
2. Receive JWT tokens via callback
3. Use tokens to access user information API
4. Create local sessions based on ad.id authentication

### MediaWiki

MediaWiki can:
1. Use OAuth extension to authenticate via ad.id
2. Automatically create/update user accounts
3. Sync user information from ad.id
4. Support SSO across multiple MediaWiki instances

## Security Features

- **Secure State Tokens**: Cryptographically secure state with nonce
- **Token Encryption**: Replit tokens stored securely
- **Service Validation**: Validate serviceId and callback URLs
- **Account Linking**: Safe account linking with email verification
- **Token Revocation**: Support for token revocation
- **Audit Logging**: All operations logged

## Files Created

### Replit Integration
- `lib/services/auth/replit-integration.ts` - Replit OAuth service
- `app/api/auth/replit/route.ts` - OAuth initiation
- `app/api/auth/replit/callback/route.ts` - OAuth callback

### MediaWiki Integration
- `lib/services/auth/mediawiki-integration-enhanced.ts` - Enhanced MediaWiki service
- `app/api/auth/mediawiki/route.ts` - OAuth initiation
- `app/api/auth/mediawiki/callback/route.ts` - OAuth callback

### Updated Files
- `lib/config/env.ts` - Added Replit and MediaWiki environment variables

## Usage Examples

### Replit Authentication

```typescript
// Redirect user to Replit OAuth
window.location.href = '/api/auth/replit?serviceId=cursor-replit&callback=/dashboard';

// Handle callback
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
if (token) {
  // Store token and create session
  localStorage.setItem('access_token', token);
}
```

### MediaWiki Authentication

```typescript
// In MediaWiki OAuth extension configuration
$wgOAuth2Config['ad-id'] = [
  'clientId' => 'your-client-id',
  'clientSecret' => 'your-client-secret',
  'authorizeUrl' => 'https://ad.id/api/auth/mediawiki',
  'tokenUrl' => 'https://ad.id/api/auth/mediawiki/callback',
];
```

### Get User Info for MediaWiki

```typescript
const response = await fetch('/api/user-info/[userId]?format=mediawiki&serviceId=mediawiki', {
  headers: { Authorization: `Bearer ${token}` }
});
const userInfo = await response.json();
// Use userInfo to create/update MediaWiki user
```

## Next Steps

1. **Replit Setup**:
   - Create Replit OAuth application
   - Configure callback URL
   - Add environment variables

2. **MediaWiki Setup**:
   - Install OAuth extension
   - Register OAuth consumer
   - Configure callback URL
   - Add environment variables

3. **Testing**:
   - Test Replit OAuth flow
   - Test MediaWiki OAuth flow
   - Test user information API
   - Test account linking
   - Test token issuance and validation

4. **Production**:
   - Set up proper OAuth 1.0a signing for MediaWiki
   - Configure rate limiting
   - Set up monitoring and alerts
   - Document API for client services
