# Security Upgrades and Tampering Hardening

This document describes the comprehensive security upgrades implemented for the JWT authentication system.

## Overview

The security upgrades include:
- **Token Security**: Token binding, replay prevention, tampering detection
- **Token Blacklist**: Revocation tracking and enforcement
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Enhanced rate limiting for token endpoints
- **Input Validation**: Comprehensive input sanitization and validation
- **Audit Logging**: Security event logging and monitoring
- **Tampering Detection**: Request integrity verification

## Token Security

### Token Binding
Tokens are bound to the device/IP that issued them to prevent token theft:
- Device fingerprinting using IP, User-Agent, and headers
- Binding verification on token validation
- Automatic rejection if binding mismatch detected

```typescript
// Token includes binding information
{
  jti: "unique-token-id",
  binding: {
    ip: "192.168.1.1",
    fingerprint: "sha256-hash-of-device",
  }
}
```

### Replay Prevention
- **JWT ID (JTI)**: Each token has a unique identifier
- **Token Blacklist**: Revoked tokens tracked by JTI
- **Nonce Support**: Optional one-time use nonces

### Token Format Validation
- Validates JWT structure before processing
- Prevents injection attacks
- Length limits to prevent DoS

## Token Blacklist System

### Features
- In-memory storage (development)
- Database-backed storage (production ready)
- Automatic cleanup of expired entries
- Bulk revocation support

### Usage
```typescript
import { blacklistToken, isTokenBlacklisted } from "@/lib/security/token-blacklist";

// Blacklist a token
await blacklistToken(tokenId, userId, serviceId, expiresAt, "User logout");

// Check if blacklisted
const blacklisted = await isTokenBlacklisted(tokenId);
```

## Security Headers

All responses include security headers:

- **Content-Security-Policy**: Prevents XSS attacks
- **Strict-Transport-Security**: Forces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

## CSRF Protection

### Implementation
- CSRF token generation and validation
- Session-based token storage
- Constant-time comparison (timing attack prevention)
- Automatic cleanup of expired tokens

### Usage
```typescript
import { withCSRFProtection } from "@/lib/security/csrf-protection";

export const POST = withCSRFProtection(async (req) => {
  // Handler code
});
```

## Rate Limiting

### Enhanced Rate Limits
- **Auth Rate Limit**: 5 requests per 15 minutes (token operations)
- **Strict Rate Limit**: 10 requests per minute (sensitive operations)
- **IP-based**: Uses IP address for identification
- **Redis Support**: Production-ready distributed rate limiting

### Rate Limit Headers
All responses include rate limit information:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

## Input Validation & Sanitization

### Features
- String sanitization (removes dangerous characters)
- Email validation and normalization
- Numeric validation with min/max
- Request body size limits
- Content-type validation

### Usage
```typescript
import { sanitizeString, sanitizeEmail, validateRequestBody } from "@/lib/security/sanitize";

const sanitized = sanitizeString(userInput, 100);
const email = sanitizeEmail(emailInput);
const body = await validateRequestBody(request, 10 * 1024);
```

## Security Audit Logging

### Event Types
- `TOKEN_ISSUED`: Token creation
- `TOKEN_REVOKED`: Token revocation
- `TOKEN_VALIDATION_FAILED`: Failed validation attempts
- `TOKEN_BINDING_MISMATCH`: Binding verification failure
- `RATE_LIMIT_EXCEEDED`: Rate limit violations
- `CSRF_VIOLATION`: CSRF token failures
- `SUSPICIOUS_ACTIVITY`: Anomalous behavior
- `UNAUTHORIZED_ACCESS_ATTEMPT`: Unauthorized access

### Usage
```typescript
import { securityAudit } from "@/lib/security/audit-logger";

securityAudit.tokenIssued({
  userId: "user-123",
  serviceId: "mapable",
  tokenId: "token-uuid",
  ip: "192.168.1.1",
});
```

## Enhanced JWT Service

### New Features
- **Token Binding**: Device/IP binding in tokens
- **JTI Support**: Unique token identifiers
- **Secure Verification**: `verifyTokenSecure()` with blacklist and binding checks
- **Format Validation**: Pre-validation of token structure

### Usage
```typescript
import { generateTokenPair, verifyTokenSecure } from "@/lib/auth/jwt-service";

// Generate with binding
const tokens = generateTokenPair(payload, { request });

// Verify with security checks
const payload = await verifyTokenSecure(token, {
  checkBlacklist: true,
  verifyBinding: true,
  request,
});
```

## Token Endpoint Security Wrapper

All token endpoints use the security wrapper:

```typescript
import { withTokenEndpointSecurity } from "@/lib/security/token-endpoint-security";

export const POST = withTokenEndpointSecurity(
  async (request) => {
    // Handler code
  },
  {
    rateLimit: "auth",
    maxBodySize: 10 * 1024,
    enableCSRF: false,
    enableTokenBinding: true,
  }
);
```

### Options
- `rateLimit`: "auth" | "strict" | "none"
- `requireAuth`: Require authentication
- `maxBodySize`: Maximum request body size
- `enableCSRF`: Enable CSRF protection
- `enableTokenBinding`: Enable token binding verification

## Security Best Practices

### 1. Token Storage
- **Access Tokens**: Store in memory or secure HTTP-only cookies
- **Refresh Tokens**: Store securely (encrypted storage)
- **Never**: Store in localStorage or sessionStorage

### 2. Token Transmission
- Always use HTTPS
- Include in `Authorization: Bearer <token>` header
- Never include in URL parameters

### 3. Token Expiration
- Access tokens: Short-lived (15 minutes default)
- Refresh tokens: Longer-lived (7 days default)
- Implement token rotation

### 4. Error Handling
- Don't leak sensitive information in errors
- Use generic error messages
- Log detailed errors server-side

### 5. Rate Limiting
- Apply to all token endpoints
- Use stricter limits for sensitive operations
- Monitor and alert on violations

## Environment Variables

Required security environment variables:

```env
# JWT Configuration
JWT_SECRET=your-strong-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=australian-disability-ltd
JWT_AUDIENCE=australian-disability-services

# Security
ENABLE_TOKEN_BINDING=true
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
```

## Monitoring & Alerts

### Key Metrics to Monitor
- Token issuance rate
- Token validation failures
- Rate limit violations
- CSRF violations
- Token binding mismatches
- Suspicious activity patterns

### Alert Thresholds
- Multiple validation failures from same IP
- High rate of token binding mismatches
- Unusual token issuance patterns
- CSRF violation spikes

## Migration Guide

### Updating Existing Endpoints

1. **Import security utilities**:
```typescript
import { withTokenEndpointSecurity } from "@/lib/security/token-endpoint-security";
```

2. **Wrap handler**:
```typescript
export const POST = withTokenEndpointSecurity(async (req) => {
  // Existing handler code
}, { rateLimit: "auth" });
```

3. **Update token generation**:
```typescript
// Old
const tokens = generateTokenPair(payload);

// New
const tokens = generateTokenPair(payload, { request });
```

4. **Update token verification**:
```typescript
// Old
const payload = verifyToken(token);

// New (with security)
const payload = await verifyTokenSecure(token, {
  checkBlacklist: true,
  verifyBinding: true,
  request,
});
```

## Testing Security Features

### Test Token Binding
```bash
# Issue token from IP 1
curl -X POST /api/tokens/issue -H "X-Forwarded-For: 192.168.1.1"

# Try to use from IP 2 (should fail)
curl -X GET /api/tokens/validate \
  -H "Authorization: Bearer <token>" \
  -H "X-Forwarded-For: 192.168.1.2"
```

### Test Rate Limiting
```bash
# Make multiple requests quickly
for i in {1..10}; do
  curl -X POST /api/tokens/issue
done
# Should get 429 after limit
```

### Test Token Blacklist
```bash
# Revoke token
curl -X POST /api/tokens/revoke -d '{"tokenId": "..."}'

# Try to validate (should fail)
curl -X GET /api/tokens/validate -H "Authorization: Bearer <revoked-token>"
```

## Security Checklist

- [x] Token binding implemented
- [x] Replay prevention (JTI)
- [x] Token blacklist system
- [x] Security headers
- [x] CSRF protection
- [x] Rate limiting
- [x] Input validation
- [x] Audit logging
- [x] Token format validation
- [x] Constant-time comparisons
- [x] Request size limits
- [x] Error handling
- [ ] Database-backed blacklist (schema needed)
- [ ] Redis rate limiting (infrastructure needed)
- [ ] SIEM integration (external system)

## Future Enhancements

1. **RS256 Support**: Asymmetric key signing for better key management
2. **Token Encryption**: Encrypt sensitive payload data
3. **Advanced Analytics**: ML-based anomaly detection
4. **Geolocation Validation**: IP geolocation checks
5. **Device Fingerprinting**: Enhanced device identification
6. **Token Rotation Policies**: Automatic token rotation
7. **Distributed Blacklist**: Redis-backed blacklist for multi-server deployments

## Support

For security issues or questions:
- Review audit logs: Check `securityAudit` logs
- Monitor metrics: Track security event rates
- Review documentation: See `JWT_AUTHENTICATION_EXCHANGE.md`
