# Integration Guide: Google Maps, Twilio, and Coinbase

This guide provides comprehensive instructions for integrating and using Google Maps Platform, Twilio SMS, and Coinbase Commerce in the MapAble application.

## Table of Contents

1. [Google Maps Platform Integration](#google-maps-platform-integration)
2. [Twilio SMS Integration](#twilio-sms-integration)
3. [Coinbase Commerce Integration](#coinbase-commerce-integration)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Google Maps Platform Integration

### Overview
Google Maps is integrated for displaying interactive maps, Street View, and 3D buildings. The integration uses the Google Maps JavaScript API.

### Prerequisites
1. Google Cloud Platform account
2. Google Maps JavaScript API enabled
3. API key with appropriate restrictions

### Setup Steps

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Maps JavaScript API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

4. **Configure API Key Restrictions** (Recommended)
   - Click on the API key to edit
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain(s): `localhost:3000/*`, `yourdomain.com/*`
   - Under "API restrictions", select "Restrict key"
   - Choose "Maps JavaScript API"

5. **Set Environment Variable**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### Configuration Options

Add these to your `.env` file for advanced configuration:

```bash
# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_STREETVIEW_ENABLED=true
GOOGLE_MAPS_3D_BUILDINGS_ENABLED=true
GOOGLE_MAPS_DEFAULT_ZOOM=13
GOOGLE_MAPS_DEFAULT_LAT=-33.8688
GOOGLE_MAPS_DEFAULT_LNG=151.2093
GOOGLE_MAPS_DEFAULT_TYPE=roadmap
GOOGLE_MAPS_3D_TILT=45
GOOGLE_MAPS_3D_HEADING=0
GOOGLE_MAPS_MAP_TYPE_CONTROL=true
```

### Usage

#### Basic Map Component

```tsx
import { GoogleMap } from "@/components/map/GoogleMap";

function MyMap() {
  return (
    <GoogleMap
      center={{ lat: -33.8688, lng: 151.2093 }}
      zoom={13}
      markers={[
        {
          position: [-33.8688, 151.2093],
          title: "Sydney",
          description: "Sydney, Australia"
        }
      ]}
      enable3DBuildings={true}
      enableStreetView={true}
    />
  );
}
```

#### Using the Hook

```tsx
import { useGoogleMaps } from "@/hooks/use-google-maps";

function MapComponent() {
  const { isLoaded, loadError, isAvailable } = useGoogleMaps();

  if (loadError) {
    return <div>Error loading maps: {loadError}</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return <GoogleMap />;
}
```

### Features
- ✅ Interactive maps with markers
- ✅ Street View integration
- ✅ 3D buildings support
- ✅ Custom markers and info windows
- ✅ Map controls (zoom, fullscreen, map type)
- ✅ Click events and callbacks

---

## Twilio SMS Integration

### Overview
Twilio SMS service is integrated for sending verification codes, notifications, and two-factor authentication via SMS.

### Prerequisites
1. Twilio account ([Sign up here](https://www.twilio.com/try-twilio))
2. Verified phone number or Twilio phone number
3. Twilio Verify service (optional, recommended)

### Setup Steps

1. **Create Twilio Account**
   - Sign up at [Twilio Console](https://console.twilio.com/)
   - Complete account verification

2. **Get Account Credentials**
   - Go to [Twilio Console Dashboard](https://console.twilio.com/)
   - Copy your Account SID and Auth Token

3. **Get a Phone Number** (if not using Verify service)
   - Go to "Phone Numbers" > "Manage" > "Buy a number"
   - Select a number with SMS capabilities
   - Copy the phone number (E.164 format: +1234567890)

4. **Set Up Twilio Verify Service** (Recommended)
   - Go to "Verify" > "Services"
   - Click "Create new Verify Service"
   - Copy the Service SID

5. **Install Twilio Package**
   ```bash
   pnpm add twilio
   ```

6. **Set Environment Variables**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Usage

#### Send Verification Code

```typescript
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";

const smsService = new TwilioSMSService();

// Send verification code
const result = await smsService.sendVerificationCode({
  phoneNumber: "+61412345678",
  userId: "user-id",
  purpose: "payment"
});

if (result.success) {
  console.log("Verification ID:", result.verificationId);
  console.log("Expires at:", result.expiresAt);
}
```

#### Verify Code

```typescript
// Verify the code
const verifyResult = await smsService.verifyCode({
  phoneNumber: "+61412345678",
  code: "123456",
  verificationId: result.verificationId
});

if (verifyResult.valid) {
  console.log("Code verified at:", verifyResult.verifiedAt);
}
```

#### Send Custom Message

```typescript
const messageResult = await smsService.sendMessage(
  "+61412345678",
  "Your payment of $100 has been processed successfully."
);

if (messageResult.success) {
  console.log("Message sent:", messageResult.messageId);
}
```

### API Route Example

```typescript
// app/api/sms/send/route.ts
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { phoneNumber, purpose } = await request.json();
  
  const smsService = new TwilioSMSService();
  const result = await smsService.sendVerificationCode({
    phoneNumber,
    purpose
  });

  return NextResponse.json(result);
}
```

### Features
- ✅ SMS verification codes
- ✅ Two-factor authentication
- ✅ Custom SMS messages
- ✅ Twilio Verify service support
- ✅ Automatic phone number formatting (E.164)
- ✅ Development mode with mock codes

---

## Coinbase Commerce Integration

### Overview
Coinbase Commerce integration allows accepting cryptocurrency payments (Bitcoin, Ethereum, USDC, etc.) through Coinbase Commerce.

### Prerequisites
1. Coinbase Commerce account
2. API key and secret
3. Webhook secret for webhook verification

### Setup Steps

1. **Create Coinbase Commerce Account**
   - Go to [Coinbase Commerce](https://commerce.coinbase.com/)
   - Sign up or log in

2. **Create API Key**
   - Go to "Settings" > "API Keys"
   - Click "Create API Key"
   - Copy the API Key and API Secret
   - **Important**: Save the secret immediately, it won't be shown again

3. **Set Up Webhook**
   - Go to "Settings" > "Webhooks"
   - Click "Add webhook endpoint"
   - Enter your webhook URL: `https://yourdomain.com/api/abilitypay/payments/coinbase/webhook`
   - Select events: `charge:created`, `charge:confirmed`, `charge:failed`, `charge:delayed`, `charge:pending`, `charge:resolved`
   - Copy the webhook secret

4. **Set Environment Variables**
   ```bash
   COINBASE_API_KEY=your_api_key_here
   COINBASE_API_SECRET=your_api_secret_here
   COINBASE_API_URL=https://api.commerce.coinbase.com
   COINBASE_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### Usage

#### Create Payment Charge

```typescript
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";

const paymentService = new PaymentProviderService({
  provider: "coinbase",
  coinbaseConfig: {
    apiKey: process.env.COINBASE_API_KEY,
    apiSecret: process.env.COINBASE_API_SECRET,
    webhookSecret: process.env.COINBASE_WEBHOOK_SECRET
  }
});

// Initiate payment
const payment = await paymentService.initiatePayment({
  amount: 100.00,
  currency: "AUD",
  description: "NDIS Payment",
  reference: "transaction-id-123",
  redirectUrl: "https://yourdomain.com/payment/success",
  cancelUrl: "https://yourdomain.com/payment/cancel",
  metadata: {
    userId: "user-id",
    orderId: "order-123"
  }
}, "coinbase");

// Redirect user to payment.hostedUrl
console.log("Payment URL:", payment.hostedUrl);
```

#### Check Payment Status

```typescript
const status = await paymentService.getPaymentStatus(
  "charge-id",
  "coinbase"
);

console.log("Status:", status.status); // PENDING, COMPLETED, EXPIRED, FAILED
```

#### API Route Example

```typescript
// POST /api/abilitypay/payments/coinbase
const response = await fetch("/api/abilitypay/payments/coinbase", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: 100.00,
    currency: "AUD",
    description: "Payment for services",
    reference: "tx-123",
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`
  })
});

const { hostedUrl, paymentId } = await response.json();
// Redirect user to hostedUrl
```

### Webhook Handling

The webhook handler is already set up at `/api/abilitypay/payments/coinbase/webhook`. It automatically:

- Verifies webhook signatures
- Updates payment transaction status
- Handles all charge events (created, confirmed, failed, etc.)
- Updates voucher and budget category status

### Supported Cryptocurrencies

Coinbase Commerce supports:
- Bitcoin (BTC)
- Ethereum (ETH)
- USD Coin (USDC)
- And more (automatically selected based on best rates)

### Features
- ✅ Multiple cryptocurrency support
- ✅ Automatic currency conversion
- ✅ Webhook integration
- ✅ Payment status tracking
- ✅ Secure signature verification
- ✅ Charge cancellation
- ✅ Charge resolution

---

## Environment Variables Setup

### Complete `.env` File Template

```bash
# ============================================
# Google Maps Platform
# ============================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_STREETVIEW_ENABLED=true
GOOGLE_MAPS_3D_BUILDINGS_ENABLED=true

# ============================================
# Twilio SMS
# ============================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# Coinbase Commerce
# ============================================
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_API_SECRET=your_coinbase_api_secret
COINBASE_API_URL=https://api.commerce.coinbase.com
COINBASE_WEBHOOK_SECRET=your_webhook_secret
```

---

## Usage Examples

### Complete Payment Flow with SMS Verification

```typescript
// 1. Send SMS verification code
const smsService = new TwilioSMSService();
const smsResult = await smsService.sendVerificationCode({
  phoneNumber: user.phoneNumber,
  purpose: "payment"
});

// 2. User enters code (frontend)
// 3. Verify code
const verifyResult = await smsService.verifyCode({
  phoneNumber: user.phoneNumber,
  code: userEnteredCode,
  verificationId: smsResult.verificationId
});

if (verifyResult.valid) {
  // 4. Create Coinbase payment
  const payment = await paymentService.initiatePayment({
    amount: 100.00,
    currency: "AUD",
    description: "Verified payment",
    reference: transactionId
  }, "coinbase");

  // 5. Redirect to payment page
  window.location.href = payment.hostedUrl;
}
```

### Map with Payment Integration

```tsx
import { GoogleMap } from "@/components/map/GoogleMap";
import { useState } from "react";

function PaymentMap() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLocationSelect = async (location) => {
    // Send SMS verification
    const smsResult = await fetch("/api/sms/send", {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: user.phoneNumber,
        purpose: "location_payment"
      })
    });

    // After verification, create payment
    const payment = await fetch("/api/abilitypay/payments/coinbase", {
      method: "POST",
      body: JSON.stringify({
        amount: 50.00,
        description: `Payment for location: ${location.lat}, ${location.lng}`,
        reference: `loc-${Date.now()}`
      })
    });
  };

  return (
    <GoogleMap
      onMapClick={setSelectedLocation}
      markers={selectedLocation ? [{
        position: [selectedLocation.lat, selectedLocation.lng],
        title: "Selected Location"
      }] : []}
    />
  );
}
```

---

## Testing

### Google Maps Testing

1. **Check API Key**
   ```typescript
   import { isGoogleMapsAvailable } from "@/lib/config/google-maps";
   console.log("Maps available:", isGoogleMapsAvailable());
   ```

2. **Test Map Loading**
   - Open browser console
   - Check for Google Maps API errors
   - Verify map renders correctly

### Twilio Testing

1. **Development Mode**
   - In development, Twilio uses mock mode
   - Codes are logged to console
   - No actual SMS sent

2. **Production Testing**
   ```typescript
   const smsService = new TwilioSMSService();
   const result = await smsService.sendMessage(
     "+61412345678",
     "Test message"
   );
   console.log("SMS sent:", result.success);
   ```

### Coinbase Testing

1. **Test Mode**
   - Use Coinbase Commerce test mode
   - Test charges don't require real cryptocurrency
   - Webhooks can be tested with ngrok

2. **Test Payment Flow**
   ```bash
   # Create test charge
   curl -X POST https://api.commerce.coinbase.com/charges \
     -H "X-CC-Api-Key: your_test_key" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Charge",
       "local_price": {"amount": "10.00", "currency": "AUD"},
       "pricing_type": "fixed_price"
     }'
   ```

---

## Troubleshooting

### Google Maps Issues

**Problem**: Map not loading
- **Solution**: Check API key is set and has correct restrictions
- **Solution**: Verify billing is enabled in Google Cloud Console
- **Solution**: Check browser console for API errors

**Problem**: "This page can't load Google Maps correctly"
- **Solution**: Add your domain to API key restrictions
- **Solution**: Check API key has Maps JavaScript API enabled

### Twilio Issues

**Problem**: SMS not sending
- **Solution**: Verify account SID and auth token
- **Solution**: Check phone number format (E.164)
- **Solution**: Verify Twilio account has sufficient balance
- **Solution**: Check Twilio console for error logs

**Problem**: Verification codes not working
- **Solution**: Check Redis connection (for code storage)
- **Solution**: Verify code expiration time
- **Solution**: Check phone number matches exactly

### Coinbase Issues

**Problem**: Payment charge creation fails
- **Solution**: Verify API key and secret are correct
- **Solution**: Check API key has proper permissions
- **Solution**: Verify amount is within limits

**Problem**: Webhooks not received
- **Solution**: Verify webhook URL is publicly accessible
- **Solution**: Check webhook secret matches
- **Solution**: Use ngrok for local testing
- **Solution**: Check Coinbase Commerce webhook logs

**Problem**: Payment status not updating
- **Solution**: Check webhook handler is receiving events
- **Solution**: Verify database connection
- **Solution**: Check transaction reference matches

---

## Security Best Practices

### Google Maps
- ✅ Restrict API key to specific domains
- ✅ Enable API key restrictions
- ✅ Monitor API usage
- ✅ Use environment variables (never commit keys)

### Twilio
- ✅ Store credentials in environment variables
- ✅ Use Twilio Verify service for better security
- ✅ Implement rate limiting for SMS sending
- ✅ Validate phone numbers before sending

### Coinbase
- ✅ Always verify webhook signatures
- ✅ Use HTTPS for webhook endpoints
- ✅ Store API secrets securely
- ✅ Implement idempotency for webhook handlers
- ✅ Log all payment events for audit

---

## Additional Resources

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms)
- [Twilio Verify Documentation](https://www.twilio.com/docs/verify)
- [Coinbase Commerce API Documentation](https://docs.commerce.coinbase.com/)
- [Coinbase Webhook Guide](https://docs.commerce.coinbase.com/docs/webhooks)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service-specific documentation
3. Check application logs
4. Contact support for each service:
   - Google Maps: [Google Cloud Support](https://cloud.google.com/support)
   - Twilio: [Twilio Support](https://support.twilio.com/)
   - Coinbase: [Coinbase Commerce Support](https://commerce.coinbase.com/support)
