# Coinbase Commerce Integration

The AbilityPay now supports Coinbase Commerce as an alternative payment method alongside blockchain tokens and NPP (New Payments Platform).

## Overview

Coinbase Commerce allows participants to pay for NDIS services using cryptocurrency (Bitcoin, Ethereum, USDC, etc.) while maintaining fiat currency settlement in AUD.

## Architecture

```
Payment Flow:
1. Participant initiates payment → PaymentService
2. PaymentService validates NDIS rules
3. If paymentMethod = "coinbase":
   - Creates Coinbase charge via CoinbaseAdapter
   - Returns hosted payment URL
   - Participant pays via Coinbase
   - Webhook updates transaction status
4. If paymentMethod = "blockchain" (default):
   - Uses existing token voucher system
```

## Configuration

### Environment Variables

```env
# Coinbase Commerce API
COINBASE_API_KEY=your_api_key
COINBASE_API_SECRET=your_api_secret
COINBASE_API_URL=https://api.commerce.coinbase.com
COINBASE_WEBHOOK_SECRET=your_webhook_secret
```

### Getting Coinbase API Credentials

1. Sign up for Coinbase Commerce: https://commerce.coinbase.com
2. Create an API key in the dashboard
3. Set up webhook endpoint: `https://yourdomain.com/api/abilitypay/payments/coinbase/webhook`
4. Copy webhook secret from Coinbase dashboard

## API Endpoints

### Initiate Coinbase Payment

```http
POST /api/abilitypay/payments
Content-Type: application/json

{
  "participantId": "user_123",
  "providerId": "provider_456",
  "serviceCode": "01_001_0107_1_1",
  "amount": 100.00,
  "categoryId": "cat_789",
  "paymentMethod": "coinbase",
  "coinbaseRedirectUrl": "https://yourdomain.com/payment/success",
  "coinbaseCancelUrl": "https://yourdomain.com/payment/cancel"
}
```

Response:
```json
{
  "id": "txn_123",
  "status": "PENDING",
  "coinbasePayment": {
    "paymentId": "charge_abc",
    "hostedUrl": "https://commerce.coinbase.com/charges/charge_abc",
    "status": "PENDING",
    "amount": 100.00,
    "currency": "AUD"
  }
}
```

### Get Payment Status

```http
GET /api/abilitypay/payments/coinbase?chargeId=charge_abc
```

### Get Charge Details

```http
GET /api/abilitypay/payments/coinbase/charge_abc
```

### Cancel Charge

```http
POST /api/abilitypay/payments/coinbase/charge_abc?action=cancel
```

## Webhook Integration

Coinbase sends webhook events to:
```
POST /api/abilitypay/payments/coinbase/webhook
```

### Webhook Events Handled

- `charge:created` - Charge was created
- `charge:confirmed` - Payment confirmed (completed)
- `charge:failed` - Payment failed
- `charge:pending` - Payment pending
- `charge:delayed` - Payment delayed (manual review)
- `charge:resolved` - Charge resolved after review

### Webhook Security

Webhooks are verified using HMAC-SHA256 signature:
- Header: `x-cc-webhook-signature`
- Header: `x-cc-webhook-timestamp`
- Secret: `COINBASE_WEBHOOK_SECRET`

## Payment Provider Service

The `PaymentProviderService` provides a unified interface for multiple payment providers:

```typescript
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";

const paymentService = new PaymentProviderService({
  provider: "coinbase",
  coinbaseConfig: {
    apiKey: process.env.COINBASE_API_KEY,
    apiSecret: process.env.COINBASE_API_SECRET,
    webhookSecret: process.env.COINBASE_WEBHOOK_SECRET,
  },
});

// Initiate payment
const payment = await paymentService.initiatePayment({
  amount: 100.00,
  currency: "AUD",
  description: "NDIS Service Payment",
  reference: "txn_123",
  redirectUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
}, "coinbase");

// Get status
const status = await paymentService.getPaymentStatus(
  payment.paymentId,
  "coinbase"
);
```

## Integration with Payment Service

The `PaymentService` now supports Coinbase payments:

```typescript
const paymentService = new PaymentService(blockchainConfig, {
  provider: "coinbase",
  coinbaseConfig: {
    apiKey: process.env.COINBASE_API_KEY,
    apiSecret: process.env.COINBASE_API_SECRET,
    webhookSecret: process.env.COINBASE_WEBHOOK_SECRET,
  },
});

// Initiate payment with Coinbase
const transaction = await paymentService.initiatePayment({
  participantId: "user_123",
  providerId: "provider_456",
  serviceCode: "01_001_0107_1_1",
  amount: 100.00,
  categoryId: "cat_789",
  paymentMethod: "coinbase",
  coinbaseRedirectUrl: "https://example.com/success",
  coinbaseCancelUrl: "https://example.com/cancel",
});
```

## Supported Cryptocurrencies

Coinbase Commerce supports:
- Bitcoin (BTC)
- Ethereum (ETH)
- USDC (USD Coin)
- And other supported cryptocurrencies

The participant can choose their preferred cryptocurrency when paying.

## Payment Flow

1. **Initiation**: Participant initiates payment via API
2. **Validation**: NDIS rules are validated (price guide, provider registration, etc.)
3. **Charge Creation**: Coinbase charge is created
4. **Payment**: Participant redirected to Coinbase hosted payment page
5. **Webhook**: Coinbase sends webhook when payment is confirmed
6. **Completion**: Transaction status updated, voucher/category updated if applicable

## Error Handling

- Invalid API credentials → 500 error
- Webhook signature verification failure → 400 error
- Payment amount validation → 400 error
- Missing required fields → 400 error

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using HMAC signature
2. **Amount Validation**: Transaction amounts are validated (min $0.01, max $100,000)
3. **Access Control**: Users can only access their own transactions
4. **Idempotency**: Consider implementing idempotency keys for payment initiation

## Testing

### Sandbox Mode

Coinbase Commerce provides a sandbox environment for testing:
- Use sandbox API URL: `https://api.sandbox.commerce.coinbase.com`
- Test webhooks using Coinbase's webhook testing tool

### Test Payments

Use Coinbase's test payment methods:
- Test credit cards (for card payments)
- Test cryptocurrency addresses

## Monitoring

Monitor Coinbase payments:
- Check webhook delivery in Coinbase dashboard
- Monitor transaction status updates
- Track failed payments and retries

## Troubleshooting

### Webhook Not Received

1. Check webhook URL is accessible
2. Verify webhook secret matches
3. Check Coinbase dashboard for delivery status
4. Review server logs for errors

### Payment Not Confirming

1. Check blockchain confirmations required
2. Verify payment amount matches charge amount
3. Check for delayed payments (may require manual review)

## Future Enhancements

- Support for recurring payments
- Multi-currency support
- Payment method preferences per participant
- Automatic retry for failed payments
- Payment analytics dashboard
