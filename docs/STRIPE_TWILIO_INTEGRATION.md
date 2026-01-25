# Stripe Link & Twilio SMS Verification Integration

The AbilityPay now supports Stripe Link payments with Twilio SMS verification for enhanced security.

## Overview

Stripe Link provides one-click checkout for returning customers, while Twilio SMS verification adds an extra layer of security through two-factor authentication (2FA) during payment processing.

## Architecture

```
Payment Flow with SMS Verification:
1. Participant initiates Stripe payment
   ↓
2. PaymentService validates NDIS rules
   ↓
3. StripeAdapter creates payment intent
   ↓
4. TwilioSMSService sends verification code
   ↓
5. Participant enters SMS code
   ↓
6. SMS code verified
   ↓
7. Stripe payment intent confirmed
   ↓
8. Transaction completed
```

## Components

### 1. Stripe Adapter (`lib/services/abilitypay/banking/stripe-adapter.ts`)

**Features:**
- Payment intent creation
- Stripe Link integration
- Customer management
- Webhook signature verification
- Refund support
- Payment method management

**Key Methods:**
- `createPaymentIntent()` - Create Stripe payment intent
- `getPaymentIntent()` - Get payment intent status
- `confirmPaymentIntent()` - Confirm payment after SMS verification
- `cancelPaymentIntent()` - Cancel payment
- `getOrCreateCustomer()` - Customer management
- `verifyWebhookSignature()` - Webhook security

### 2. Twilio SMS Service (`lib/services/verification/twilio-sms.ts`)

**Features:**
- SMS verification code generation
- Twilio Verify service integration
- Direct SMS fallback
- Code storage and validation
- Phone number formatting (E.164)
- Expiration handling

**Key Methods:**
- `sendVerificationCode()` - Send SMS with verification code
- `verifyCode()` - Verify SMS code
- `sendMessage()` - Send custom SMS messages
- `isServiceEnabled()` - Check service availability

## Configuration

### Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_... (for frontend)

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VA... (optional, for Twilio Verify)
```

### Getting Stripe API Keys

1. Sign up for Stripe: https://stripe.com
2. Get API keys from Dashboard → Developers → API keys
3. Set up webhook endpoint: `https://yourdomain.com/api/abilitypay/payments/stripe/webhook`
4. Copy webhook signing secret

### Getting Twilio Credentials

1. Sign up for Twilio: https://www.twilio.com
2. Get Account SID and Auth Token from Console
3. Get a phone number (or use Twilio Verify service)
4. (Optional) Create Verify Service for managed verification

## API Endpoints

### Initiate Stripe Payment with SMS

```http
POST /api/abilitypay/payments/stripe?action=initiate
Content-Type: application/json

{
  "participantId": "user_123",
  "providerId": "provider_456",
  "serviceCode": "01_001_0107_1_1",
  "amount": 100.00,
  "categoryId": "cat_789",
  "email": "participant@example.com",
  "phone": "+61412345678",
  "serviceDescription": "Support Worker Services"
}
```

Response:
```json
{
  "transactionId": "txn_123",
  "paymentIntent": {
    "id": "pi_abc123",
    "clientSecret": "pi_abc123_secret_xyz",
    "status": "requires_payment_method"
  },
  "smsVerification": {
    "sent": true,
    "verificationId": "verify_123",
    "expiresAt": "2024-01-01T12:10:00Z"
  }
}
```

### Verify SMS Code and Confirm Payment

```http
POST /api/abilitypay/payments/stripe?action=verify-sms
Content-Type: application/json

{
  "transactionId": "txn_123",
  "phoneNumber": "+61412345678",
  "verificationCode": "123456",
  "paymentIntentId": "pi_abc123"
}
```

Response:
```json
{
  "success": true,
  "transactionId": "txn_123",
  "paymentIntent": {
    "id": "pi_abc123",
    "status": "succeeded"
  },
  "verifiedAt": "2024-01-01T12:05:00Z"
}
```

### Get Payment Status

```http
GET /api/abilitypay/payments/stripe?paymentIntentId=pi_abc123
```

### SMS Verification Endpoints

#### Send SMS Code
```http
POST /api/abilitypay/verification/sms?action=send
Content-Type: application/json

{
  "phoneNumber": "+61412345678",
  "purpose": "payment"
}
```

#### Verify SMS Code
```http
POST /api/abilitypay/verification/sms?action=verify
Content-Type: application/json

{
  "phoneNumber": "+61412345678",
  "code": "123456",
  "verificationId": "verify_123"
}
```

## Payment Flow

### Step 1: Initiate Payment
1. Participant initiates payment via API
2. System validates NDIS rules
3. Stripe payment intent created
4. SMS verification code sent to participant's phone
5. Payment intent returned (not yet confirmed)

### Step 2: SMS Verification
1. Participant receives SMS with 6-digit code
2. Participant enters code in frontend
3. Code verified via API
4. If valid, Stripe payment intent confirmed
5. Payment processed

### Step 3: Completion
1. Stripe webhook received (payment_intent.succeeded)
2. Transaction status updated to COMPLETED
3. Voucher/category updated if applicable
4. Participant notified

## Frontend Integration

### React Hook for Stripe + SMS

```typescript
import { useState } from "react";

function StripePaymentWithSMS() {
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);

  const initiatePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/abilitypay/payments/stripe?action=initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: "user_123",
          providerId: "provider_456",
          amount: 100.00,
          categoryId: "cat_789",
          serviceCode: "01_001_0107_1_1",
          email: "user@example.com",
          phone: "+61412345678",
        }),
      });

      const data = await response.json();
      setPaymentIntent(data.paymentIntent);
      
      // Show SMS code input
      alert(`SMS code sent to ${data.phoneNumber}`);
    } catch (error) {
      console.error("Payment initiation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndConfirm = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/abilitypay/payments/stripe?action=verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: paymentIntent.transactionId,
          phoneNumber: "+61412345678",
          verificationCode,
          paymentIntentId: paymentIntent.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Payment successful!");
      }
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={initiatePayment} disabled={loading}>
        Pay with Stripe Link
      </button>
      
      {paymentIntent && (
        <div>
          <input
            type="text"
            placeholder="Enter SMS code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
          <button onClick={verifyAndConfirm} disabled={loading}>
            Verify & Pay
          </button>
        </div>
      )}
    </div>
  );
}
```

## Webhook Integration

### Stripe Webhook Events Handled

- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled
- `payment_intent.requires_action` - Additional action needed
- `payment_intent.processing` - Payment processing

### Webhook Security

Webhooks are verified using Stripe's signature verification:
- Header: `stripe-signature`
- Secret: `STRIPE_WEBHOOK_SECRET`
- HMAC-SHA256 signature

## SMS Verification Details

### Code Generation
- 6-digit numeric code
- Valid for 10 minutes
- One-time use
- Stored securely (Redis or database)

### Twilio Verify Service (Recommended)
- Managed verification flow
- Automatic code generation
- Built-in expiration
- Better security

### Direct SMS (Fallback)
- Manual code generation
- Custom message
- Code stored in cache
- Manual verification

## Security Considerations

### SMS Verification
- Codes expire after 10 minutes
- Codes are single-use
- Rate limiting on SMS sending
- Phone number validation (E.164 format)

### Stripe Security
- Webhook signature verification
- Payment intent confirmation required
- Customer authentication
- PCI compliance (handled by Stripe)

### Payment Flow Security
- SMS verification before payment confirmation
- Transaction amount validation
- Provider registration verification
- NDIS rule enforcement

## Error Handling

### SMS Failures
- If SMS fails to send, payment intent still created
- User can request new code
- Retry mechanism available

### Verification Failures
- Invalid code → 400 error
- Expired code → 400 error
- Too many attempts → Rate limited

### Payment Failures
- Stripe error messages returned
- Transaction status updated
- User notified of failure

## Testing

### Development Mode
- SMS service uses mock mode
- Codes logged to console
- No actual SMS sent
- Stripe test mode

### Test Cards
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 0002`

### Test Phone Numbers
Use Twilio test numbers:
- US: `+15005550006` (always succeeds)
- US: `+15005550001` (always fails)

## Monitoring

### SMS Delivery
- Track SMS send success rate
- Monitor Twilio API errors
- Log verification attempts

### Payment Success
- Track Stripe payment success rate
- Monitor webhook delivery
- Track SMS verification completion rate

## Troubleshooting

### SMS Not Received
1. Check phone number format (E.164)
2. Verify Twilio credentials
3. Check Twilio account balance
4. Review Twilio logs

### Payment Intent Not Confirming
1. Check SMS code verification
2. Verify payment intent status
3. Check Stripe dashboard
4. Review webhook logs

### Webhook Not Received
1. Verify webhook URL is accessible
2. Check webhook secret matches
3. Review Stripe dashboard for delivery status
4. Check server logs

## Best Practices

1. **Always verify SMS before confirming payment**
2. **Use Twilio Verify service for production**
3. **Implement rate limiting on SMS requests**
4. **Store verification codes securely**
5. **Log all verification attempts**
6. **Handle SMS failures gracefully**
7. **Provide clear error messages**
8. **Support code resend functionality**

## Future Enhancements

- Voice call verification (Twilio)
- Email verification as backup
- Biometric verification
- Multi-factor authentication (MFA)
- Remember device option
- Verification code resend with cooldown
