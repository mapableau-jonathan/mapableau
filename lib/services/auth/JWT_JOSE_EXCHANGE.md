# JWT/JOSE Data Exchange Orchestration

## Overview

Comprehensive JWT/JOSE (JSON Object Signing and Encryption) data exchange orchestration system for secure data transfer between services.

## JOSE Standards Support

### JWT (JSON Web Token)
- Signed tokens with multiple algorithms
- Standard claims (iss, sub, aud, exp, iat, jti)
- Custom claims support

### JWS (JSON Web Signature)
- Signed data (not just tokens)
- Multiple signature algorithms
- Detached signatures support

### JWE (JSON Web Encryption)
- Encrypted data
- Multiple encryption algorithms
- Key management algorithms

### JWK (JSON Web Key)
- Key management
- RSA, EC, and symmetric keys
- Key rotation support

## Architecture

```
┌─────────────┐
│  Service A  │
└──────┬──────┘
       │
       │ 1. Request Data Exchange
       │ POST /api/jose/exchange
       │
┌──────▼──────────────────────────────────────┐
│      Data Exchange Orchestrator            │
│  ┌──────────────────────────────────────┐  │
│  │  1. Validate Services                 │  │
│  │  2. Create JWT Payload                │  │
│  │  3. Get/Generate Keys                 │  │
│  │  4. Sign (JWT/JWS)                    │  │
│  │  5. Encrypt (JWE) if needed           │  │
│  │  6. Return Token                      │  │
│  └────────────────────────────────────┘  │
└──────┬──────────────────────────────────────┘
       │
       │ 2. Return Token
       │
┌──────▼──────┐
│  Service A  │
└──────┬──────┘
       │
       │ 3. Send Token to Service B
       │
┌──────▼──────┐
│  Service B  │
└──────┬──────┘
       │
       │ 4. Validate Token
       │ POST /api/jose/validate
       │
┌──────▼──────────────────────────────────────┐
│      Data Exchange Orchestrator            │
│  ┌──────────────────────────────────────┐  │
│  │  1. Detect Format (JWT/JWE/JWS)      │  │
│  │  2. Decrypt if JWE                    │  │
│  │  3. Verify Signature                  │  │
│  │  4. Validate Claims                   │  │
│  │  5. Return Decoded Data               │  │
│  └──────────────────────────────────────┘  │
└──────┬──────────────────────────────────────┘
       │
       │ 5. Return Validated Data
       │
┌──────▼──────┐
│  Service B  │
└─────────────┘
```

## API Endpoints

### Data Exchange

#### Exchange Data
```
POST /api/jose/exchange
Body: {
  fromService: "mapable",
  toService: "accessibooks",
  data: { ... },
  options: {
    sign: true,
    encrypt: true,
    algorithm: "HS256",
    encryptionAlgorithm: "A256GCM",
    keyId: "optional-key-id"
  }
}
Response: {
  success: true,
  token: "eyJ...",
  format: "nested",
  keyId: "key-id",
  expiresIn: 3600
}
```

#### Validate Token
```
POST /api/jose/validate
Body: {
  token: "eyJ...",
  toService: "accessibooks",
  format: "nested" // optional, auto-detected
}
Response: {
  valid: true,
  data: { ... },
  fromService: "mapable",
  toService: "accessibooks"
}
```

### Key Management

#### List Keys
```
GET /api/jose/keys
Response: {
  keys: [
    { keyId: "...", publicKey: { ... } }
  ],
  count: 1
}
```

#### Generate Key
```
POST /api/jose/keys
Body: {
  type: "RSA" | "EC" | "oct",
  keySize: 2048, // for RSA/oct
  curve: "P-256", // for EC
  algorithm: "RS256" // optional
}
Response: {
  success: true,
  keyId: "...",
  publicKey: { ... }
}
```

#### Get Key
```
GET /api/jose/keys/[keyId]
Response: {
  keyId: "...",
  publicKey: { ... }
}
```

#### Delete Key
```
DELETE /api/jose/keys/[keyId]
Response: {
  success: true,
  message: "Key deleted successfully"
}
```

## Supported Algorithms

### Signing Algorithms
- **HS256/HS384/HS512**: HMAC with SHA
- **RS256/RS384/RS512**: RSA with SHA
- **ES256/ES384/ES512**: ECDSA with SHA
- **PS256/PS384/PS512**: RSASSA-PSS with SHA

### Encryption Algorithms
- **A128GCM/A192GCM/A256GCM**: AES GCM
- **A128CBC-HS256/A192CBC-HS384/A256CBC-HS512**: AES CBC with HMAC

### Key Management Algorithms
- **dir**: Direct key agreement
- **RSA-OAEP/RSA-OAEP-256**: RSA OAEP
- **A128KW/A192KW/A256KW**: AES Key Wrap
- **ECDH-ES**: ECDH-ES key agreement

## Token Formats

### JWT (Signed Only)
```
Header.Payload.Signature
```
- Signed with HMAC or RSA/EC private key
- Payload is readable
- Use for non-sensitive data

### JWE (Encrypted Only)
```
Header.EncryptedKey.IV.Ciphertext.Tag
```
- Encrypted with AES
- Payload is not readable
- Use for sensitive data

### Nested JWT (Signed + Encrypted)
```
JWE(JWT(Header.Payload.Signature))
```
- First signed, then encrypted
- Maximum security
- Use for sensitive data requiring authentication

## Usage Examples

### Basic Data Exchange (Signed JWT)
```typescript
const response = await fetch('/api/jose/exchange', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    fromService: 'mapable',
    toService: 'accessibooks',
    data: {
      userId: 'user-123',
      email: 'user@example.com',
      permissions: ['read:library']
    },
    options: {
      sign: true,
      encrypt: false,
      algorithm: 'HS256'
    }
  })
});

const { token, format } = await response.json();
```

### Encrypted Data Exchange
```typescript
const response = await fetch('/api/jose/exchange', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    fromService: 'mapable',
    toService: 'accessibooks',
    data: {
      sensitiveData: 'secret information'
    },
    options: {
      sign: true,
      encrypt: true,
      algorithm: 'HS256',
      encryptionAlgorithm: 'A256GCM'
    }
  })
});

const { token, format } = await response.json();
// format: "nested"
```

### Validate Received Token
```typescript
const response = await fetch('/api/jose/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: receivedToken,
    toService: 'accessibooks',
    format: 'nested' // optional
  })
});

const { valid, data, fromService } = await response.json();
if (valid) {
  // Use data
  console.log('Data from', fromService, ':', data);
}
```

### Generate Key Pair
```typescript
const response = await fetch('/api/jose/keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'RSA',
    keySize: 2048,
    algorithm: 'RS256'
  })
});

const { keyId, publicKey } = await response.json();
```

## Security Features

### Token Security
- **Signing**: Prevents tampering
- **Encryption**: Prevents reading
- **Expiration**: Automatic expiration
- **Audience Validation**: Ensures token for correct service
- **Key Rotation**: Support for key rotation

### Key Management
- **Key Storage**: Secure key storage (in-memory for now, use KMS in production)
- **Key Rotation**: Automatic key rotation support
- **Key Revocation**: Key deletion support
- **Public Key Sharing**: Only public keys exposed

### Service Validation
- **Service Registry**: Validates service exists
- **Access Control**: Validates user has access to services
- **Audit Logging**: All operations logged

## Best Practices

### When to Use Each Format

**JWT (Signed Only)**:
- Non-sensitive data
- Public information
- Performance-critical scenarios

**JWE (Encrypted Only)**:
- Sensitive data
- No authentication needed
- One-way data transfer

**Nested JWT (Signed + Encrypted)**:
- Sensitive data requiring authentication
- Maximum security
- Service-to-service communication

### Key Management

1. **Use Key Rotation**: Regularly rotate keys
2. **Store Keys Securely**: Use KMS in production
3. **Never Expose Private Keys**: Only share public keys
4. **Use Appropriate Key Sizes**: 2048+ for RSA, 256+ for symmetric

### Token Lifecycle

1. **Set Appropriate Expiration**: Match token lifetime to use case
2. **Validate Immediately**: Don't store tokens longer than needed
3. **Revoke When Needed**: Delete keys if compromised
4. **Monitor Usage**: Track token issuance and validation

## Integration with Existing System

### Token Issuance Service
- Uses JOSE service for token generation
- Supports multiple algorithms
- Key management integration

### Service Registry
- Validates services for data exchange
- Checks service permissions
- Manages service relationships

### User Data Manager
- Can use JOSE for encrypted data transfer
- Field-level encryption support
- Secure data exchange

## Files Created

- `lib/services/auth/jose-service.ts` - JOSE operations (JWT, JWE, JWS)
- `lib/services/auth/jwk-service.ts` - Key management (JWK)
- `lib/services/auth/data-exchange-orchestrator.ts` - Orchestration service
- `app/api/jose/exchange/route.ts` - Data exchange endpoint
- `app/api/jose/validate/route.ts` - Token validation endpoint
- `app/api/jose/keys/route.ts` - Key management endpoints
- `app/api/jose/keys/[keyId]/route.ts` - Individual key operations

## Next Steps

1. **Implement Proper ASN.1 Parsing**: For RSA/EC key conversion
2. **Add Key Rotation**: Automatic key rotation service
3. **Integrate with KMS**: Use AWS KMS, Azure Key Vault, etc.
4. **Add Key Caching**: Cache keys for performance
5. **Implement Key Escrow**: For key recovery
6. **Add Key Versioning**: Support multiple key versions
7. **Performance Optimization**: Optimize encryption/decryption
8. **Add Compression**: Support for compressed payloads
