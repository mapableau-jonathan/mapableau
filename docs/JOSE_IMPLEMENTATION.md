# JOSE Implementation Guide

## Overview

The authentication system has been migrated from `jsonwebtoken` to `jose` (JSON Object Signing and Encryption), a modern, standards-compliant library for JWT/JWE operations.

## Why JOSE?

1. **Standards Compliance**: Full JOSE (RFC 7515-7519) implementation
2. **Better Security**: Built-in encryption support (JWE), better key management
3. **Edge Runtime Compatible**: Works in Vercel Edge, Cloudflare Workers, etc.
4. **Modern API**: Native async/await, TypeScript support
5. **Active Maintenance**: Well-maintained, recommended by Next.js team

## Installation

```bash
pnpm add jose
# Remove jsonwebtoken if no longer needed elsewhere
# pnpm remove jsonwebtoken @types/jsonwebtoken
```

## Architecture

### Key Components

1. **JOSE Key Manager** (`lib/auth/jose-key-manager.ts`)
   - Manages signing and encryption keys
   - Supports key rotation
   - Singleton pattern for efficient key reuse

2. **JWT Service** (`lib/auth/jwt-service.ts`)
   - Migrated to use JOSE
   - Supports both JWS (signed) and JWE (encrypted) tokens
   - Backward compatible API (with async updates)

### Key Features

#### 1. Token Signing (JWS)
```typescript
import { generateAccessToken } from "@/lib/auth/jwt-service";

const token = await generateAccessToken({
  sub: userId,
  email: user.email,
  role: user.role,
});
```

#### 2. Token Encryption (JWE)
```typescript
const encryptedToken = await generateAccessToken(
  { sub: userId, email: user.email },
  { encrypt: true } // Creates JWE instead of JWS
);
```

#### 3. Token Verification
```typescript
import { verifyToken, verifyTokenSecure } from "@/lib/auth/jwt-service";

// Basic verification
const payload = await verifyToken(token);

// Secure verification with blacklist and binding checks
const payload = await verifyTokenSecure(token, {
  checkBlacklist: true,
  verifyBinding: true,
  request,
});
```

## Migration Notes

### Breaking Changes

1. **All functions are now async**
   - `generateAccessToken()` → `await generateAccessToken()`
   - `verifyToken()` → `await verifyToken()`
   - `generateTokenPair()` → `await generateTokenPair()`

2. **Synchronous functions removed**
   - The old synchronous `verifyToken()` is now async
   - Use `verifyTokenSecure()` for enhanced security

### Updated Code Examples

#### Before (jsonwebtoken)
```typescript
import { generateTokenPair, verifyToken } from "@/lib/auth/jwt-service";

// Synchronous
const tokens = generateTokenPair(payload);
const decoded = verifyToken(token);
```

#### After (JOSE)
```typescript
import { generateTokenPair, verifyToken } from "@/lib/auth/jwt-service";

// Async
const tokens = await generateTokenPair(payload);
const decoded = await verifyToken(token);
```

## Key Management

### Environment Variables

The key manager uses the same environment variables:
- `JWT_SECRET` - Main signing key (required)
- `JWT_REFRESH_SECRET` - Refresh token signing key (optional, defaults to JWT_SECRET)
- `JWT_ISSUER` - Token issuer (default: "australian-disability-ltd")
- `JWT_AUDIENCE` - Token audience (default: "australian-disability-services")
- `JWT_EXPIRES_IN` - Access token expiration (default: "15m")
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: "7d")

### Key Initialization

Keys are automatically initialized on first use:
```typescript
import { keyManager } from "@/lib/auth/jose-key-manager";

// Keys are initialized automatically
const signingKey = await keyManager.getSigningKey();
const encryptionKey = await keyManager.getEncryptionKey();
```

## Security Features

### 1. Token Encryption (JWE)

For sensitive tokens, use encryption:
```typescript
const encryptedToken = await generateAccessToken(
  { sub: userId, email: user.email },
  { encrypt: true }
);
```

### 2. Token Binding

Prevent token theft with device/IP binding:
```typescript
const token = await generateAccessToken(payload, {
  request: { headers: req.headers },
});

// Verification checks binding
const payload = await verifyTokenSecure(token, {
  verifyBinding: true,
  request: { headers: req.headers },
});
```

### 3. Token Blacklisting

Revoke tokens using the blacklist:
```typescript
const payload = await verifyTokenSecure(token, {
  checkBlacklist: true,
});
```

## Performance

- **Key Caching**: Keys are cached after first initialization
- **Async Operations**: Non-blocking token operations
- **Edge Compatible**: Works in serverless and edge environments

## Error Handling

JOSE provides specific error types:
```typescript
import * as jose from "jose";

try {
  const payload = await verifyToken(token);
} catch (error) {
  if (error instanceof jose.errors.JWTExpired) {
    // Token expired
  } else if (error instanceof jose.errors.JWTInvalid) {
    // Invalid token
  } else if (error instanceof jose.errors.JWEDecryptionFailed) {
    // Decryption failed
  }
}
```

## Testing

### Unit Tests

```typescript
import { generateAccessToken, verifyToken } from "@/lib/auth/jwt-service";

test("generates and verifies token", async () => {
  const token = await generateAccessToken({
    sub: "user123",
    email: "test@example.com",
  });
  
  const payload = await verifyToken(token);
  expect(payload.sub).toBe("user123");
});
```

### Integration Tests

```typescript
test("token encryption and decryption", async () => {
  const encrypted = await generateAccessToken(
    { sub: "user123", email: "test@example.com" },
    { encrypt: true }
  );
  
  const payload = await verifyToken(encrypted);
  expect(payload.sub).toBe("user123");
});
```

## Troubleshooting

### Common Issues

1. **"Signing key not initialized"**
   - Ensure `JWT_SECRET` is set in environment
   - Check key manager initialization logs

2. **"Token decryption failed"**
   - Token may not be encrypted (use `verifyToken` for JWS)
   - Encryption key mismatch

3. **"Token expired"**
   - Normal behavior for expired tokens
   - Use refresh token to get new access token

## Future Enhancements

1. **Key Rotation**: Implement automatic key rotation
2. **Asymmetric Keys**: Support RS256/ES256 for public key verification
3. **JWKS Endpoint**: Expose JSON Web Key Set for public key distribution
4. **Token Compression**: Optional token compression for large payloads

## References

- [JOSE RFC 7515-7519](https://tools.ietf.org/html/rfc7515)
- [jose library documentation](https://github.com/panva/jose)
- [JWT.io](https://jwt.io/) - JWT debugger and validator
