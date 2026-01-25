# JWT Pipe Integration Guide

## Overview

Bidirectional JWT integration with MediaWiki and Wix enables JWT-based Single Sign-On (SSO) in both directions:

- **Outbound**: Issue JWTs from our platform that MediaWiki/Wix can validate
- **Inbound**: Validate JWTs from MediaWiki/Wix to authenticate users in our platform

## Architecture

### Outbound Flow (Our Platform → MediaWiki/Wix)

1. User authenticates with our platform
2. Our platform issues JWT token with provider-specific configuration
3. User can use this JWT with MediaWiki/Wix for SSO
4. MediaWiki/Wix validates JWT using shared secret

### Inbound Flow (MediaWiki/Wix → Our Platform)

1. User authenticates with MediaWiki/Wix
2. MediaWiki/Wix issues JWT token
3. Our platform validates JWT using shared secret
4. User account linked/created in our platform
5. Tokens issued for our platform services

## Configuration

### Environment Variables

#### MediaWiki JWT Configuration

```env
# Outbound JWT (for MediaWiki to validate)
MEDIAWIKI_JWT_SECRET=shared-secret-for-signing
MEDIAWIKI_JWT_ISSUER=https://yourdomain.com
MEDIAWIKI_JWT_AUDIENCE=mediawiki
MEDIAWIKI_JWT_EXPIRES_IN=1h

# Inbound JWT (from MediaWiki to validate)
MEDIAWIKI_JWT_INBOUND_SECRET=shared-secret-for-validation
MEDIAWIKI_JWT_INBOUND_ISSUER=mediawiki
MEDIAWIKI_JWT_INBOUND_AUDIENCE=https://yourdomain.com
```

#### Wix JWT Configuration

```env
# Outbound JWT (for Wix to validate)
WIX_JWT_SECRET=shared-secret-for-signing
WIX_JWT_ISSUER=https://yourdomain.com
WIX_JWT_AUDIENCE=wix
WIX_JWT_EXPIRES_IN=1h

# Inbound JWT (from Wix to validate)
WIX_JWT_INBOUND_SECRET=shared-secret-for-validation
WIX_JWT_INBOUND_ISSUER=wix
WIX_JWT_INBOUND_AUDIENCE=https://yourdomain.com
```

## API Endpoints

### Issue Outbound JWT

```
POST /api/auth/jwt-pipe/{provider}/outbound
```

**Path Parameters:**
- `provider`: `mediawiki` or `wix`

**Request Headers:**
- `Authorization: Bearer <token>` - User authentication token

**Request Body (optional):**
```json
{
  "serviceId": "mapable",
  "additionalClaims": {
    "customField": "value"
  }
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "provider": "mediawiki"
}
```

### Validate Inbound JWT

```
POST /api/auth/jwt-pipe/{provider}/inbound
```

**Path Parameters:**
- `provider`: `mediawiki` or `wix`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serviceId": "mapable",
  "callbackUrl": "/dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user-id",
  "profile": {
    "id": "provider-user-id",
    "email": "user@example.com",
    "name": "User Name",
    "image": null
  },
  "callbackUrl": "https://yourdomain.com/dashboard?token=..."
}
```

**Cookies Set:**
- `access_token`: HTTP-only access token
- `refresh_token`: HTTP-only refresh token (if available)

## JWT Payload Format

### Outbound JWT (Our Platform → MediaWiki/Wix)

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "iss": "https://yourdomain.com",
  "aud": "mediawiki",
  "exp": 1735789200,
  "iat": 1735785600,
  "jti": "token-id",
  "mediawiki_user_id": "user-id",
  "groups": []
}
```

### Inbound JWT (MediaWiki/Wix → Our Platform)

Expected format from MediaWiki/Wix:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "iss": "mediawiki",
  "aud": "https://yourdomain.com",
  "exp": 1735789200,
  "iat": 1735785600
}
```

## Usage Examples

### Issue JWT for MediaWiki

```typescript
// Client-side
const response = await fetch('/api/auth/jwt-pipe/mediawiki/outbound', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    serviceId: 'mapable',
    additionalClaims: {
      groups: ['admin', 'editor']
    }
  })
});

const { token, expiresIn } = await response.json();

// Use token with MediaWiki
// Redirect to MediaWiki with JWT as query parameter or header
```

### Validate JWT from Wix

```typescript
// Server-side (Wix webhook/callback)
const response = await fetch('/api/auth/jwt-pipe/wix/inbound', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: wixJWTToken,
    serviceId: 'mapable',
    callbackUrl: '/dashboard'
  })
});

const { userId, profile } = await response.json();
// User is authenticated via Wix JWT
```

## Security Considerations

### Shared Secrets

- **Never commit secrets**: Store in environment variables only
- **Use different secrets**: Outbound and inbound secrets can differ for added security
- **Rotate regularly**: Change secrets periodically
- **Secure storage**: Use secret management services in production

### JWT Validation

- **Issuer/Audience**: Always validate issuer and audience claims
- **Expiration**: Check expiration time (`exp` claim)
- **Signature**: Always verify JWT signature
- **Replay Prevention**: Use `jti` (JWT ID) for token blacklisting if needed

### Token Expiration

- **Short-lived tokens**: Outbound JWTs should have short expiration (1 hour or less)
- **Refresh tokens**: Use refresh tokens for long-lived sessions
- **Token rotation**: Implement token rotation for enhanced security

## Integration Points

### MediaWiki Integration

1. **Configure MediaWiki**: Set up JWT validation in MediaWiki extensions
2. **Shared Secret**: Configure `MEDIAWIKI_JWT_SECRET` in both systems
3. **Issuer/Audience**: Configure matching issuer/audience claims
4. **User Mapping**: Map MediaWiki user ID to platform user ID

### Wix Integration

1. **Configure Wix**: Set up JWT validation in Wix app settings
2. **Shared Secret**: Configure `WIX_JWT_SECRET` in both systems
3. **Issuer/Audience**: Configure matching issuer/audience claims
4. **Member Mapping**: Map Wix member ID to platform user ID

## Error Handling

### Common Errors

| Error | Status | Description |
|-------|--------|-------------|
| `JWT not configured` | 500 | Provider JWT secret not configured |
| `Invalid JWT token` | 401 | Token signature validation failed |
| `JWT token expired` | 401 | Token expiration time passed |
| `Invalid JWT issuer` | 401 | Issuer claim doesn't match expected |
| `Invalid JWT audience` | 401 | Audience claim doesn't match expected |
| `Email not found in JWT` | 400 | Required email claim missing |

## Testing

### Test Outbound JWT

1. Authenticate user in our platform
2. Call `/api/auth/jwt-pipe/{provider}/outbound`
3. Verify JWT token is issued
4. Decode and validate JWT structure
5. Test JWT with MediaWiki/Wix

### Test Inbound JWT

1. Generate test JWT from MediaWiki/Wix (or use test token)
2. Call `/api/auth/jwt-pipe/{provider}/inbound`
3. Verify JWT is validated
4. Check user account is linked/created
5. Verify tokens are issued

## Production Considerations

1. **Secret Management**: Use AWS Secrets Manager, Azure Key Vault, or similar
2. **Token Blacklisting**: Implement token blacklist for revoked tokens
3. **Rate Limiting**: Add rate limiting to JWT endpoints
4. **Monitoring**: Log JWT issuance and validation events
5. **Key Rotation**: Support key rotation without service interruption
6. **Token Encryption**: Consider JWE (encrypted JWTs) for sensitive data

## Troubleshooting

### JWT Not Validating

- Check secret matches in both systems
- Verify issuer and audience claims
- Check token expiration time
- Review JWT structure (header, payload, signature)

### User Not Found

- Verify email claim is present in JWT
- Check user exists in database
- Review account linking logic

### Token Expiration Issues

- Check expiration time (`exp` claim)
- Verify system clocks are synchronized
- Consider clock skew tolerance in validation
