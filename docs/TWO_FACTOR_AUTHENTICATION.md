# Two-Factor Authentication (2FA) with Google Authenticator

The AbilityPay Protocol now includes TOTP-based two-factor authentication compatible with Google Authenticator and other TOTP apps.

## Overview

Two-factor authentication adds an extra layer of security by requiring a time-based one-time password (TOTP) in addition to your regular password. This uses the industry-standard TOTP algorithm (RFC 6238) compatible with Google Authenticator, Microsoft Authenticator, Authy, and other TOTP apps.

## Features

- **TOTP Support**: Compatible with Google Authenticator and all TOTP apps
- **QR Code Setup**: Easy setup with QR code scanning
- **Manual Entry**: Support for manual key entry
- **Backup Codes**: Generate one-time backup codes for account recovery
- **Rotating Codes**: Codes refresh every 30 seconds
- **Secure Storage**: Secrets encrypted in database

## How It Works

1. **Setup**: User generates a TOTP secret and scans QR code
2. **Verification**: User enters 6-digit code from authenticator app
3. **Enablement**: 2FA is enabled after successful verification
4. **Login**: User enters password + TOTP code for authentication
5. **Backup**: Backup codes available if authenticator is lost

## Configuration

### Environment Variables

```env
# Optional: Customize 2FA issuer name
TOTP_ISSUER="AbilityPay Protocol"
```

### Required Packages

Install the required packages:

```bash
npm install speakeasy qrcode
```

## API Endpoints

### Setup 2FA

#### Generate Secret and QR Code

```http
POST /api/auth/2fa/setup?action=generate
```

Response:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KG...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP",
  "timeRemaining": 25
}
```

#### Verify and Enable 2FA

```http
POST /api/auth/2fa/setup?action=verify
Content-Type: application/json

{
  "token": "123456"
}
```

Response:
```json
{
  "success": true,
  "enabled": true,
  "backupCodes": [
    "12345678",
    "23456789",
    ...
  ],
  "message": "2FA enabled successfully. Please save your backup codes."
}
```

### Verify 2FA Token

```http
POST /api/auth/2fa/verify?action=token
Content-Type: application/json

{
  "token": "123456"
}
```

Response:
```json
{
  "success": true,
  "verified": true,
  "timeRemaining": 15
}
```

### Verify Backup Code

```http
POST /api/auth/2fa/verify?action=backup
Content-Type: application/json

{
  "code": "12345678"
}
```

### Get 2FA Status

```http
GET /api/auth/2fa/status
```

Response:
```json
{
  "enabled": true,
  "hasBackupCodes": true,
  "backupCodesCount": 5,
  "timeRemaining": 20
}
```

### Disable 2FA

```http
POST /api/auth/2fa/disable
Content-Type: application/json

{
  "verificationToken": "123456"
}
```

Or with backup code:
```json
{
  "backupCode": "12345678"
}
```

### Generate New Backup Codes

```http
POST /api/auth/2fa/backup-codes
```

Response:
```json
{
  "success": true,
  "backupCodes": [
    "87654321",
    "76543210",
    ...
  ],
  "message": "New backup codes generated. Please save these codes securely.",
  "warning": "Previous backup codes have been invalidated."
}
```

## Frontend Integration

### Setup Component

```tsx
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

function SecuritySettings() {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div>
      {showSetup ? (
        <TwoFactorSetup
          onComplete={() => {
            setShowSetup(false);
            // Refresh status
          }}
          onCancel={() => setShowSetup(false)}
        />
      ) : (
        <button onClick={() => setShowSetup(true)}>
          Enable 2FA
        </button>
      )}
    </div>
  );
}
```

### Verification Component

```tsx
import { TwoFactorVerify } from "@/components/auth/two-factor-verify";
import { useTwoFactor } from "@/client/src/hooks/useTwoFactor";

function LoginWith2FA() {
  const { verifyToken, verifyBackupCode } = useTwoFactor();

  return (
    <TwoFactorVerify
      onVerify={async (token) => {
        return await verifyToken(token);
      }}
      onBackupCode={async (code) => {
        return await verifyBackupCode(code);
      }}
      title="Enter Verification Code"
      description="Open Google Authenticator and enter the 6-digit code"
    />
  );
}
```

### React Hook

```tsx
import { useTwoFactor } from "@/client/src/hooks/useTwoFactor";

function MyComponent() {
  const {
    loading,
    error,
    status,
    getStatus,
    generateSecret,
    verifyAndEnable,
    verifyToken,
    disable,
    generateBackupCodes,
  } = useTwoFactor();

  // Use the hook methods
  const handleEnable = async () => {
    const secret = await generateSecret();
    // Show QR code to user
    // After user scans and enters code:
    const result = await verifyAndEnable(userEnteredCode);
    // Show backup codes
  };

  return (
    // Your component JSX
  );
}
```

## Setup Flow

### Step 1: Generate Secret

1. User clicks "Enable 2FA"
2. System generates TOTP secret
3. QR code displayed to user
4. Manual entry key also shown

### Step 2: Scan QR Code

1. User opens Google Authenticator app
2. User scans QR code or enters key manually
3. App generates rotating 6-digit codes

### Step 3: Verify and Enable

1. User enters current 6-digit code from app
2. System verifies code
3. 2FA enabled if verification succeeds
4. Backup codes generated and displayed

### Step 4: Save Backup Codes

1. User saves backup codes securely
2. Codes can be used if authenticator is lost
3. Each backup code can only be used once

## Verification Flow

### During Login

1. User enters email and password
2. If 2FA enabled, system requests TOTP code
3. User opens authenticator app
4. User enters current 6-digit code
5. System verifies code
6. Login completes if verification succeeds

### Using Backup Codes

1. If authenticator unavailable, user can use backup code
2. User enters 8-digit backup code
3. System verifies and marks code as used
4. Code cannot be reused

## Security Features

### Code Rotation

- Codes refresh every 30 seconds
- Previous codes become invalid
- Clock skew tolerance: ±60 seconds (2 time steps)

### Backup Codes

- 10 codes generated initially
- 8-digit numeric codes
- Stored as SHA-256 hashes
- Single-use only
- Can be regenerated (invalidates old codes)

### Secret Storage

- Secrets stored in database
- Should be encrypted in production
- Never exposed to frontend
- Only QR code and manual key shown during setup

## Supported Authenticator Apps

- **Google Authenticator**: iOS, Android
- **Microsoft Authenticator**: iOS, Android, Windows
- **Authy**: iOS, Android, Desktop
- **1Password**: All platforms
- **LastPass Authenticator**: iOS, Android
- **Any TOTP-compatible app**

## Database Schema

The User model includes:

```prisma
model User {
  // ... other fields
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?   // Encrypted TOTP secret
  twoFactorConfig       String?   // JSON config
  twoFactorBackupCodes  String?   // Comma-separated hashed codes
}
```

## Best Practices

1. **Always Show Backup Codes**: Display backup codes during setup
2. **Encrypt Secrets**: Encrypt TOTP secrets in production
3. **Rate Limiting**: Limit verification attempts to prevent brute force
4. **Clear Instructions**: Provide clear setup instructions
5. **Recovery Process**: Have a process for users who lose access
6. **Regular Backups**: Encourage users to save backup codes securely

## Error Handling

### Invalid Code

- Returns 400 error with message
- Allows retry (with rate limiting)
- Logs failed attempts for security

### Expired Setup

- QR codes don't expire, but secrets can be regenerated
- Old secrets become invalid when new one is generated

### Lost Authenticator

- User can use backup codes
- Admin can disable 2FA if needed (with proper verification)
- User can regenerate backup codes if still have access

## Testing

### Test Tokens

In development, you can use any 6-digit code for testing if you disable verification temporarily.

### Test Backup Codes

Backup codes are 8-digit numbers. In development, you can test with any 8-digit code if verification is disabled.

## Troubleshooting

### QR Code Not Scanning

1. Ensure QR code is clear and well-lit
2. Try manual entry key instead
3. Check app permissions (camera access)

### Code Not Working

1. Check device time is synchronized
2. Ensure code hasn't expired (30-second window)
3. Verify correct account in authenticator app
4. Try next code (wait for refresh)

### Lost Authenticator

1. Use backup codes to access account
2. Disable 2FA using backup code
3. Set up 2FA again with new authenticator

## Additional Resources

- [TOTP Algorithm (RFC 6238)](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
- [Speakeasy Documentation](https://github.com/speakeasyjs/speakeasy)
- [QR Code Generation](https://github.com/soldair/node-qrcode)
