# Biometric + TOTP Setup Guide

Complete guide for setting up and using biometric authentication and TOTP with the AbilityPay Payment Gateway.

## Quick Start

### 1. Install Required Packages

```bash
npm install speakeasy qrcode
```

For production WebAuthn verification, also install:
```bash
npm install @simplewebauthn/server
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# TOTP Configuration
TOTP_ISSUER="AbilityPay Protocol"

# WebAuthn Configuration
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_RP_NAME="AbilityPay Protocol"
WEBAUTHN_ORIGIN=https://yourdomain.com

# For local development
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```

### 3. Run Database Migration

```bash
npm run db:push
```

This will add:
- `WebAuthnCredential` model
- `webauthnChallenge` and `webauthnCredentials` to User model
- `twoFactorEnabled`, `twoFactorSecret`, `twoFactorConfig`, `twoFactorBackupCodes` to User model

## Setup Flow

### Step 1: Enable TOTP (Google Authenticator)

1. Navigate to Security Settings
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with Google Authenticator
4. Enter 6-digit code to verify
5. Save backup codes securely

**API:**
```http
POST /api/auth/2fa/setup?action=generate
POST /api/auth/2fa/setup?action=verify
```

### Step 2: Register Biometric

1. Navigate to Security Settings
2. Click "Register Biometric"
3. Choose device (iPhone, Android, Security Key)
4. Follow device prompts (Face ID, Touch ID, etc.)
5. Name your device

**API:**
```http
POST /api/auth/biometric/register?action=generate
POST /api/auth/biometric/register?action=verify
```

### Step 3: Verify Setup

Check your security setup:
```http
GET /api/auth/2fa/status
GET /api/auth/biometric/credentials
```

## Payment Security Levels

### Low-Value Payments (< $1000 AUD)

**Requirements:**
- TOTP OR Biometric (either one)

**Flow:**
1. User initiates payment
2. System checks requirements
3. User authenticates with TOTP OR Biometric
4. Payment processed

### High-Value Payments (≥ $1000 AUD)

**Requirements:**
- TOTP AND Biometric (both required)

**Flow:**
1. User initiates payment
2. System checks requirements
3. User enters TOTP code → Verified
4. User authenticates with Biometric → Verified
5. Payment processed

## Frontend Integration

### Payment Security Component

```tsx
import { PaymentSecurityVerification } from "@/components/abilitypay/payment-security-verification";

function PaymentPage() {
  const [showVerification, setShowVerification] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const handlePayment = async (verification) => {
    try {
      const response = await fetch("/api/abilitypay/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentData,
          ...verification, // Includes totpToken, backupCode, biometricCredential
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.requiresTOTP || error.requiresBiometric) {
          // Show verification component
          setShowVerification(true);
          return;
        }
        throw new Error(error.message);
      }

      const result = await response.json();
      // Payment successful
    } catch (error) {
      console.error("Payment failed:", error);
    }
  };

  if (showVerification) {
    return (
      <PaymentSecurityVerification
        amount={paymentData.amount}
        onVerify={handlePayment}
        onCancel={() => setShowVerification(false)}
      />
    );
  }

  return (
    <PaymentForm
      onSubmit={(data) => {
        setPaymentData(data);
        handlePayment({});
      }}
    />
  );
}
```

## API Reference

### Get Security Requirements

```http
GET /api/abilitypay/payments/security-requirements?amount=1500
```

**Response:**
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

## Testing

### Test TOTP

1. Enable TOTP for test user
2. Generate test token from authenticator app
3. Verify token via API

### Test Biometric

1. Register biometric on test device
2. Use browser DevTools to simulate WebAuthn
3. Or test on real device with Face ID/Touch ID

### Test Payment Flow

1. Create test payment < $1000 → Should require TOTP OR Biometric
2. Create test payment ≥ $1000 → Should require TOTP AND Biometric
3. Verify both methods work correctly

## Troubleshooting

### WebAuthn Not Available

**Issue:** `navigator.credentials` is undefined

**Solutions:**
- Ensure HTTPS (required for WebAuthn)
- Check browser support (Chrome, Firefox, Safari, Edge)
- Verify device has biometric capability

### TOTP Verification Fails

**Issue:** Code always invalid

**Solutions:**
- Check device time synchronization
- Verify code hasn't expired (30-second window)
- Ensure correct account in authenticator app
- Try next code (wait for refresh)

### Payment Blocked

**Issue:** Payment requires security but verification fails

**Solutions:**
- Check security requirements: `GET /api/abilitypay/payments/security-requirements?amount=...`
- Verify TOTP is enabled: `GET /api/auth/2fa/status`
- Verify biometric is registered: `GET /api/auth/biometric/credentials`
- Ensure both are provided for high-value transactions

## Security Best Practices

1. **Always require both for high-value**: Transactions ≥ $1000 should require TOTP + Biometric
2. **Encrypt stored credentials**: WebAuthn credentials should be encrypted at rest
3. **Rate limit verification attempts**: Prevent brute force attacks
4. **Log all verification attempts**: Audit trail for security events
5. **Timeout challenges**: Challenges expire after 60 seconds
6. **Backup codes**: Always allow backup code fallback for TOTP
7. **Device management**: Allow users to view and revoke registered devices

## Production Checklist

- [ ] Configure `WEBAUTHN_RP_ID` with production domain
- [ ] Configure `WEBAUTHN_ORIGIN` with production URL
- [ ] Enable HTTPS (required for WebAuthn)
- [ ] Install `@simplewebauthn/server` for full attestation verification
- [ ] Encrypt WebAuthn credentials in database
- [ ] Set up rate limiting for verification endpoints
- [ ] Configure logging for security events
- [ ] Test on iOS, Android, Windows, macOS
- [ ] Test with security keys (YubiKey, etc.)
- [ ] Document recovery process for lost devices

## Additional Resources

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [Payment Gateway Security Documentation](./PAYMENT_GATEWAY_SECURITY.md)
- [Two-Factor Authentication Documentation](./TWO_FACTOR_AUTHENTICATION.md)
