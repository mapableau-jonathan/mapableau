# SAML/OAuth Integration Guide

## Overview

This document describes the comprehensive SAML 2.0 and OAuth 2.0 integration implementation in the MapableAU platform.

## Architecture

### Unified Identity Provider System

The platform supports multiple authentication methods through a unified service layer:

1. **OAuth 2.0 Providers**: Google, Facebook, Microsoft (Azure AD), Wix
2. **SAML 2.0 Providers**: Enterprise SSO via SAML
3. **Local Authentication**: Email/password credentials

All providers are integrated through:
- `identity-provider-service.ts` - OAuth providers
- `saml-service.ts` - SAML providers
- `profile-normalizer.ts` - Unified profile format
- `account-linker.ts` - Account linking across providers
- `token-issuance-service.ts` - Token generation

## SAML 2.0 Implementation

### Features

- **SP-Initiated Flow**: Service Provider initiates authentication
- **IdP-Initiated Flow**: Identity Provider initiates authentication (via callback)
- **HTTP POST Binding**: Primary binding for SAML responses
- **HTTP Redirect Binding**: Alternative binding for SAML requests
- **Relay State**: Secure state token for request tracking
- **Attribute Extraction**: Extracts email, name, and other attributes from SAML assertions

### Configuration

#### Required Environment Variables

```env
# SAML Identity Provider (IdP) Configuration
SAML_ENTRY_POINT=https://idp.example.com/sso
SAML_ISSUER=https://yourdomain.com/api/auth/sso/saml
SAML_IDP_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"

# Optional: Service Provider (SP) Private Key for request signing
SAML_SP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Optional: SAML Configuration
SAML_SIGNATURE_ALGORITHM=rsa-sha256
SAML_DIGEST_ALGORITHM=sha256
SAML_WANT_ASSERTIONS_SIGNED=true
SAML_WANT_MESSAGE_SIGNED=true
SAML_FORCE_AUTHN=false
SAML_ALLOW_CREATE=true
SAML_NAME_ID_FORMAT=urn:oasis:names:tc:SAML:2.0:nameid-format:transient
SAML_DEFLATE_REQUEST=false
```

#### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SAML_ENTRY_POINT` | IdP SSO URL | Required |
| `SAML_ISSUER` | SP Entity ID | `{BASE_URL}/api/auth/sso/saml` |
| `SAML_IDP_CERT` | IdP certificate for signature verification | Optional |
| `SAML_SP_PRIVATE_KEY` | SP private key for request signing | Optional |
| `SAML_SIGNATURE_ALGORITHM` | Signature algorithm | `rsa-sha256` |
| `SAML_DIGEST_ALGORITHM` | Digest algorithm | `sha256` |
| `SAML_WANT_ASSERTIONS_SIGNED` | Require signed assertions | `false` |
| `SAML_WANT_MESSAGE_SIGNED` | Require signed messages | `false` |
| `SAML_FORCE_AUTHN` | Force re-authentication | `false` |
| `SAML_ALLOW_CREATE` | Allow NameID creation | `true` |
| `SAML_NAME_ID_FORMAT` | NameID format | `transient` |
| `SAML_DEFLATE_REQUEST` | Deflate SAML requests | `false` |

### SAML Flow

#### SP-Initiated Flow

1. User clicks "Login with SAML" → `/api/auth/sso/saml`
2. System generates SAML AuthnRequest XML
3. User redirected to IdP with `SAMLRequest` and `RelayState`
4. User authenticates with IdP
5. IdP POSTs SAML response to `/api/auth/sso/saml/callback`
6. System validates and parses SAML response
7. User account linked/created
8. Tokens issued and user redirected to callback URL

#### IdP-Initiated Flow

1. User authenticates directly with IdP
2. IdP redirects to `/api/auth/sso/saml/callback` with SAML response
3. System validates and processes SAML response
4. User account linked/created
5. Tokens issued and user redirected to dashboard

### API Endpoints

#### Initiate SAML SSO

```
GET /api/auth/sso/saml?serviceId=mapable&callback=/dashboard
```

**Query Parameters:**
- `serviceId` (optional): Service identifier (default: "mapable")
- `callback` (optional): Callback URL after authentication (default: "/dashboard")

**Response:**
- Redirects to IdP SSO URL with SAMLRequest

#### SAML Callback

```
POST /api/auth/sso/saml/callback
GET /api/auth/sso/saml/callback
```

**Request Body (POST):**
- `SAMLResponse`: Base64 encoded SAML response
- `RelayState`: Base64 encoded relay state

**Query Parameters (GET):**
- `SAMLResponse`: Base64 encoded SAML response
- `RelayState`: Base64 encoded relay state

**Response:**
- Redirects to callback URL with access token cookie

## OAuth 2.0 Implementation

### Supported Providers

1. **Google**: `google`
2. **Facebook**: `facebook`
3. **Microsoft (Azure AD)**: `microsoft`
4. **Wix**: `wix`

### Configuration

#### Google OAuth

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Facebook OAuth

```env
FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret
```

#### Microsoft (Azure AD)

```env
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

#### Wix OAuth

```env
WIX_CLIENT_ID=your-client-id
WIX_APP_ID=your-app-id
```

### API Endpoints

#### Initiate OAuth

```
GET /api/auth/identity-provider/{provider}?serviceId=mapable&callback=/dashboard
```

**Providers:** `google`, `facebook`, `microsoft`, `wix`

#### OAuth Callback

```
GET /api/auth/identity-provider/{provider}/callback
```

## Unified Profile Format

All identity providers (OAuth and SAML) normalize to a consistent profile format:

```typescript
interface NormalizedProfile {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  rawProfile: any;
  additionalData?: Record<string, any>;
}
```

## Account Linking

The system automatically links accounts across providers:

1. **Same Email**: If user exists with same email, account is linked
2. **Same Provider**: If provider account already linked, tokens are updated
3. **New Account**: Creates new user if no match found

## Token Issuance

After successful authentication (OAuth or SAML):

1. Access token issued (JWT with JOSE)
2. Refresh token issued (optional)
3. Tokens stored in HTTP-only cookies
4. Token metadata logged for audit

## Security Features

### SAML

- **Relay State Validation**: Prevents CSRF attacks
- **XML Signature Verification**: Validates IdP signatures (if configured)
- **Nonce Tracking**: Prevents replay attacks
- **Secure Cookies**: HTTP-only, secure in production

### OAuth

- **State Parameter**: Prevents CSRF attacks
- **Code Exchange**: Secure authorization code exchange
- **Token Binding**: Optional token binding to requests
- **Secure Cookies**: HTTP-only, secure in production

## Error Handling

### SAML Errors

- `501 Not Implemented`: SAML not configured
- `503 Service Unavailable`: SAML entry point not configured
- `400 Bad Request`: Invalid SAML response
- `401 Unauthorized`: Authentication failed

### OAuth Errors

- `500 Internal Server Error`: OAuth initiation failed
- `400 Bad Request`: Invalid OAuth code/state
- `401 Unauthorized`: Authentication failed

## Testing

### Test SAML Flow

1. Configure SAML environment variables
2. Navigate to `/api/auth/sso/saml`
3. Complete authentication with IdP
4. Verify callback processes response
5. Check tokens are issued

### Test OAuth Flow

1. Configure OAuth provider credentials
2. Navigate to `/api/auth/identity-provider/{provider}`
3. Complete OAuth flow
4. Verify callback processes response
5. Check tokens are issued

## Production Considerations

### SAML

1. **Use Proper XML Parser**: Consider using `xml2js` or `passport-saml` for production
2. **Signature Validation**: Enable signature verification for security
3. **Certificate Management**: Use secure certificate storage
4. **Error Logging**: Log SAML errors for troubleshooting
5. **Metadata**: Support IdP metadata for dynamic configuration

### OAuth

1. **Callback URL Validation**: Validate callback URLs
2. **State Parameter**: Always use state parameter
3. **Token Expiration**: Configure appropriate token expiration
4. **Refresh Tokens**: Implement refresh token rotation
5. **Error Handling**: Proper error messages without leaking secrets

## Troubleshooting

### SAML Not Working

- Check `SAML_ENTRY_POINT` is configured
- Verify IdP certificate is valid
- Check callback URL matches IdP configuration
- Review SAML response XML for errors

### OAuth Not Working

- Verify client ID/secret are correct
- Check callback URLs match provider configuration
- Verify scopes are requested correctly
- Review OAuth error responses

## Future Enhancements

1. **IdP Metadata Support**: Automatic configuration from IdP metadata
2. **Advanced XML Signing**: Full XML signature validation
3. **SAML Logout**: Single Logout (SLO) support
4. **OAuth 2.0 Device Flow**: For IoT devices
5. **Federated Identity**: Cross-domain identity federation
