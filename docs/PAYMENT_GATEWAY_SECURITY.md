# Payment Gateway Security - TOTP + Biometric Hardening

The AbilityPay Payment Gateway now requires multi-factor authentication (MFA) for enhanced security, combining TOTP (Time-based One-Time Password) and WebAuthn biometric authentication.

## Overview

The payment gateway implements a layered security approach:

1. **TOTP Verification**: Google Authenticator compatible codes
2. **Biometric Authentication**: WebAuthn (Fingerprint, Face ID, Touch ID, Windows Hello, Security Keys)
3. **Adaptive Requirements**: Security requirements based on transaction amount

## Security Levels

### Low-Value Transactions (< $1000)
- **TOTP OR Biometric**: Either method sufficient
- Provides good security for routine payments

### High-Value Transactions (≥ $1000)
- **TOTP AND Biometric**: Both methods required
- Maximum security for significant payments
- Prevents single-point-of-failure attacks

## Features

### Multi-Factor Authentication
- **TOTP**: 6-digit rotating codes (30-second intervals)
- **Biometric**: Platform authenticators (Touch ID, Face ID, Windows Hello)
- **Security Keys**: Cross-platform authenticators (YubiKey, etc.)

### Adaptive Security
- Automatic requirement detection based on amount
- User-friendly flow (TOTP first, then biometric)
- Clear error messages and recovery options

### Payment Flow Integration
- Seamless integration into payment initiation
- Real-time security requirement checks
- Graceful fallback to backup codes

## API Endpoints

### Get Security Requirements

```http
GET /api/abilitypay/payments/security-requirements?amount=1500
```

Response:
```json
{
  "requiresTOTP": true,
  "requiresBiometric": true,
  "hasTOTP": true,
  "hasBiometric": true,
  "biometricOptions": {
    "challenge": "...",
    "allowCredentials": [...],
    "timeout": 60000,
    "userVerification": "preferred",
    "rpId": "localhost"
  }
}
```

### Initiate Payment with Security

```http
POST /api/abilitypay/payments
Content-Type: application/json

{
  "participantId": "...",
  "providerId": "...",
  "amount": 1500,
  "serviceCode": "...",
  "categoryId": "...",
  "totpToken": "123456",
  "biometricCredential": {
    "id": "...",
    "rawId": "...",
    "response": {
      "authenticatorData": "...",
      "clientDataJSON": "...",
      "signature": "..."
    },
    "type": "public-key"
  }
}
```

If security verification is missing or fails:
```json
{
  "error": "Security verification required",
  "message": "TOTP verification required but not provided",
  "requiresTOTP": true,
  "requiresBiometric": true,
  "biometricOptions": {...}
}
```

## Frontend Integration

### Payment Security Verification Component

```tsx
import { PaymentSecurityVerification } from "@/components/abilitypay/payment-security-verification";

function PaymentForm() {
  const handlePayment = async (verification) => {
    // Verification includes totpToken, backupCode, and/or biometricCredential
    const response = await fetch("/api/abilitypay/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...paymentData,
        ...verification,
      }),
    });
  };

  return (
    <PaymentSecurityVerification
      amount={paymentAmount}
      onVerify={handlePayment}
      onCancel={() => setShowPayment(false)}
    />
  );
}
```

## Configuration

### Environment Variables

```env
# WebAuthn Configuration
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_RP_NAME=AbilityPay Protocol
WEBAUTHN_ORIGIN=https://yourdomain.com

# TOTP Configuration
TOTP_ISSUER=AbilityPay Protocol
```

### Payment Security Service

```typescript
const paymentSecurity = new PaymentSecurityService({
  highValueThreshold: 1000, // Amount requiring both TOTP + Biometric
  requireBiometric: false, // Always require biometric (optional)
  requireTOTP: false, // Always require TOTP (optional)
  allowBiometricOnly: true, // Allow biometric without TOTP for low-value
});
```

## Security Flow

### High-Value Payment Flow

1. **User initiates payment** (≥ $1000)
2. **System checks requirements** → Requires TOTP + Biometric
3. **User enters TOTP code** → Verified
4. **User authenticates with biometric** → Verified
5. **Payment processed** → Both verifications passed

### Low-Value Payment Flow

1. **User initiates payment** (< $1000)
2. **System checks requirements** → Requires TOTP OR Biometric
3. **User authenticates** (either method)
4. **Payment processed** → Verification passed

## Supported Biometric Methods

### Platform Authenticators
- **iOS**: Face ID, Touch ID
- **Android**: Fingerprint, Face Unlock
- **Windows**: Windows Hello (Face, Fingerprint, PIN)
- **macOS**: Touch ID

### Cross-Platform Authenticators
- **Security Keys**: YubiKey, Titan Security Key
- **USB Authenticators**: FIDO2 devices
- **NFC Authenticators**: Contactless security keys

## Database Schema

### WebAuthnCredential Model

```prisma
model WebAuthnCredential {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(...)
  credentialId  String   @unique
  publicKey     String   @db.Text
  counter       Int      @default(0)
  deviceName    String?
  createdAt     DateTime  @default(now())
  lastUsedAt    DateTime?
}
```

### User Model Extensions

```prisma
model User {
  // ... existing fields
  webauthnChallenge     String?   // Temporary challenge storage
  webauthnCredentials   WebAuthnCredential[]
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?
  // ...
}
```

## Best Practices

### Security
1. **Always require both for high-value**: Transactions ≥ $1000 should require TOTP + Biometric
2. **Encrypt stored credentials**: WebAuthn credentials should be encrypted at rest
3. **Rate limit verification attempts**: Prevent brute force attacks
4. **Log all verification attempts**: Audit trail for security events
5. **Timeout challenges**: Challenges expire after 60 seconds

### User Experience
1. **Clear instructions**: Explain why security is required
2. **Progressive disclosure**: Show requirements step-by-step
3. **Error recovery**: Provide clear error messages and recovery options
4. **Backup codes**: Always allow backup code fallback for TOTP

### Implementation
1. **Use WebAuthn library**: Consider @simplewebauthn/server for production
2. **Verify attestations**: Validate device attestations in production
3. **Handle errors gracefully**: Network errors, device unavailability
4. **Test on multiple devices**: iOS, Android, Windows, macOS

## Troubleshooting

### Biometric Not Available
- Check browser support: `navigator.credentials` API
- Verify HTTPS: WebAuthn requires secure context
- Check device capabilities: Device must support biometrics

### TOTP Verification Fails
- Check device time synchronization
- Verify code hasn't expired (30-second window)
- Ensure correct account in authenticator app

### Payment Blocked
- Verify both TOTP and biometric if required
- Check transaction amount threshold
- Ensure security methods are properly configured

## Additional Resources

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn Library](https://simplewebauthn.dev/)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [Payment Security Best Practices](https://stripe.com/docs/security)
