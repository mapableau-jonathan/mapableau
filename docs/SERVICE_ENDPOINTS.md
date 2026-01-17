# Service Endpoints Configuration

## Overview

This document describes the service endpoints configured for JWT token delivery in the Custom Identity Provider implementation.

## Service Domains

### MapAble
- **Domain**: `mapable.com.au`
- **Service ID**: `mapable`
- **Default Callback URL**: `https://mapable.com.au/auth/callback`
- **Environment Variable**: `MAPABLE_CALLBACK_URL`
- **Allowed Scopes**: `read:profile`, `read:email`, `read:services`
- **Token Expiration**: 3600 seconds (1 hour)

### AccessiBooks
- **Domain**: `accessibooks.com.au`
- **Service ID**: `accessibooks`
- **Default Callback URL**: `https://accessibooks.com.au/auth/callback`
- **Environment Variable**: `ACCESSIBOOKS_CALLBACK_URL`
- **Allowed Scopes**: `read:profile`, `read:email`, `read:services`
- **Token Expiration**: 3600 seconds (1 hour)

### Disapedia
- **Domain**: `disapedia.au`
- **Service ID**: `disapedia`
- **Default Callback URL**: `https://disapedia.au/auth/callback`
- **Environment Variable**: `DISAPEDIA_CALLBACK_URL`
- **Allowed Scopes**: `read:profile`, `read:email`, `read:services`
- **Token Expiration**: 3600 seconds (1 hour)

### MediaWiki
- **Service ID**: `mediawiki`
- **Default Callback URL**: Configured via `MEDIAWIKI_CALLBACK_URL`
- **Environment Variable**: `MEDIAWIKI_CALLBACK_URL`
- **Allowed Scopes**: `read:profile`, `read:email`, `write:user`
- **Token Expiration**: 7200 seconds (2 hours)

### Cursor/Replit Applications
- **Service ID**: `cursor-replit`
- **Default Callback URL**: Configured via `CURSOR_REPLIT_CALLBACK_URL`
- **Environment Variable**: `CURSOR_REPLIT_CALLBACK_URL`
- **Allowed Scopes**: `read:profile`, `read:email`
- **Token Expiration**: 1800 seconds (30 minutes)

## Identity Provider Domain

The identity provider service is hosted at:
- **Primary Domain**: `ad.org.au` (or `ad.id` as configured)
- **Environment Variable**: `AD_ID_DOMAIN`

## OAuth Callback URLs

Each OAuth provider redirects to the identity provider at:
- Google: `https://ad.org.au/api/auth/identity-provider/google/callback`
- Facebook: `https://ad.org.au/api/auth/identity-provider/facebook/callback`
- Microsoft: `https://ad.org.au/api/auth/identity-provider/microsoft/callback`
- Wix: `https://ad.org.au/api/auth/identity-provider/wix/callback`

## Authentication Flow

1. User initiates OAuth on service (e.g., `mapable.com.au`)
2. Service redirects to: `https://ad.org.au/api/auth/identity-provider/{provider}?serviceId={serviceId}&callbackUrl={callbackUrl}`
3. Identity provider handles OAuth flow
4. Identity provider redirects to service callback URL with JWT token:
   - `https://mapable.com.au/auth/callback?token={jwt}&refreshToken={refresh}&expiresIn={seconds}&serviceId={serviceId}`

## Security Considerations

### Callback URL Validation

The service registry validates callback URLs using:
1. **Exact Match**: Callback URL must exactly match configured URL, OR
2. **Domain Validation**: URL must be from an allowed domain:
   - `mapable.com.au` or `www.mapable.com.au`
   - `accessibooks.com.au` or `www.accessibooks.com.au`
   - `disapedia.au` or `www.disapedia.au`
3. **Path Validation**: Callback path must include `/auth/callback` or `/oauth/callback`
4. **Development Mode**: Localhost URLs are allowed in development

### Token Delivery

- Tokens are delivered via HTTPS redirect
- Tokens are service-specific and cannot be used across services
- Token expiration is enforced per service configuration
- Refresh tokens are provided for session continuity

## Environment Configuration

Example `.env` configuration:

```env
# Identity Provider Domain
AD_ID_DOMAIN=https://ad.org.au

# Service Callback URLs
MAPABLE_CALLBACK_URL=https://mapable.com.au/auth/callback
ACCESSIBOOKS_CALLBACK_URL=https://accessibooks.com.au/auth/callback
DISAPEDIA_CALLBACK_URL=https://disapedia.au/auth/callback
MEDIAWIKI_CALLBACK_URL=https://wiki.example.com/auth/callback
CURSOR_REPLIT_CALLBACK_URL=https://apps.example.com/auth/callback
```

## Testing

In development, you can override callback URLs:
- Use `localhost` for local testing
- Use environment variables to point to staging domains
- Service registry validates domains in production mode

## API Endpoints

### Token Issuance
- **Endpoint**: `POST /api/tokens/issue`
- **Authentication**: Service credentials (client ID/secret)
- **Response**: JWT token pair (access + refresh)

### Token Validation
- **Endpoint**: `POST /api/tokens/validate`
- **Authentication**: Bearer token
- **Response**: Token payload if valid

### Token Revocation
- **Endpoint**: `POST /api/tokens/revoke`
- **Authentication**: Service credentials
- **Response**: Success confirmation

### User Information
- **Endpoint**: `GET /api/user-info/[userId]`
- **Authentication**: Bearer token (service-specific JWT)
- **Response**: User data in requested format
