# PayPal Integration

The AbilityPay now supports PayPal payments with full webhook integration for payment processing.

## Overview

PayPal integration provides a secure payment method for NDIS participants, supporting both PayPal accounts and credit/debit cards. The integration includes order creation, approval flow, capture, and webhook handling.

## Architecture

```
PayPal Payment Flow:
1. Participant initiates PayPal payment
   ↓
2. PaymentService validates NDIS rules
   ↓
3. PayPalAdapter creates order
   ↓
4. Participant redirected to PayPal for approval
   ↓
5. Participant approves payment on PayPal
   ↓
6. PayPal redirects back with order ID
   ↓
7. System captures approved order
   ↓
8. Webhook confirms payment completion
   ↓
9. Transaction completed
```

## Components

### 1. PayPal Adapter (`lib/services/abilitypay/banking/paypal-adapter.ts`)

**Features:**
- OAuth 2.0 authentication
- Order creation and management
- Payment capture
- Refund support
- Webhook signature verification
- Order status tracking

**Key Methods:**
- `createOrder()` - Create PayPal order
- `getOrder()` - Get order details
- `captureOrder()` - Capture approved order
- `refundCapture()` - Refund a captured payment
- `cancelOrder()` - Cancel an order
- `verifyWebhookSignature()` - Webhook security
- `getPaymentStatus()` - Get payment status from order

## Configuration

### Environment Variables

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENVIRONMENT=sandbox  # or "production"
PAYPAL_WEBHOOK_ID=your_webhook_id  # Optional, for webhook verification
```

### Getting PayPal API Credentials

1. Sign up for PayPal Developer: https://developer.paypal.com
2. Create a new app in Dashboard → My Apps & Credentials
3. Get Client ID and Secret
4. Set up webhook endpoint: `https://yourdomain.com/api/abilitypay/payments/paypal/webhook`
5. Copy webhook ID from webhook configuration

### PayPal Environments

- **Sandbox**: For testing (default)
  - Use sandbox credentials
  - Test with PayPal sandbox accounts
  - Webhook testing via PayPal webhook simulator

- **Production**: For live payments
  - Use production credentials
  - Requires PayPal business account approval
  - Real payments processed

## API Endpoints

### Initiate PayPal Payment

```http
POST /api/abilitypay/payments/paypal?action=initiate
Content-Type: application/json

{
  "participantId": "user_123",
  "providerId": "provider_456",
  "serviceCode": "01_001_0107_1_1",
  "amount": 100.00,
  "categoryId": "cat_789",
  "serviceDescription": "Support Worker Services",
  "returnUrl": "https://yourapp.com/payment/success",
  "cancelUrl": "https://yourapp.com/payment/cancel"
}
```

Response:
```json
{
  "transactionId": "txn_123",
  "order": {
    "id": "5O190127TN364715T",
    "status": "CREATED",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..."
  }
}
```

### Capture Approved Order

```http
POST /api/abilitypay/payments/paypal?action=capture
Content-Type: application/json

{
  "orderId": "5O190127TN364715T",
  "transactionId": "txn_123"
}
```

Response:
```json
{
  "success": true,
  "transactionId": "txn_123",
  "capture": {
    "id": "3C679077HH908993F",
    "status": "COMPLETED",
    "amount": 100.00,
    "currency": "AUD"
  }
}
```

### Get Payment Status

```http
GET /api/abilitypay/payments/paypal?orderId=5O190127TN364715T
```

## Payment Flow

### Step 1: Initiate Payment
1. Participant initiates payment via API
2. System validates NDIS rules
3. PayPal order created
4. Approval URL returned

### Step 2: PayPal Approval
1. Participant redirected to PayPal
2. Participant logs in and approves payment
3. PayPal redirects back to return URL with order ID

### Step 3: Capture Payment
1. System receives order ID from redirect
2. Order is captured (payment processed)
3. Transaction status updated

### Step 4: Webhook Confirmation
1. PayPal sends webhook event
2. System verifies webhook signature
3. Transaction marked as COMPLETED
4. Voucher/category updated if applicable

## Frontend Integration

### React Hook for PayPal

```typescript
import { usePayPalPayment } from "@/hooks/usePayPalPayment";

function PayPalPaymentComponent() {
  const {
    loading,
    error,
    initiatePayment,
    captureOrder,
    redirectToPayPal,
  } = usePayPalPayment();

  const handlePayment = async () => {
    try {
      // Step 1: Initiate payment
      const { transactionId, order } = await initiatePayment({
        participantId: "user_123",
        providerId: "provider_456",
        serviceCode: "01_001_0107_1_1",
        amount: 100.00,
        categoryId: "cat_789",
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
      });

      // Step 2: Redirect to PayPal
      redirectToPayPal(order.approvalUrl);
    } catch (error) {
      console.error("Payment failed:", error);
    }
  };

  // On return from PayPal (in success page)
  const handleCapture = async (orderId: string, transactionId: string) => {
    try {
      const result = await captureOrder(orderId, transactionId);
      if (result.success) {
        alert("Payment successful!");
      }
    } catch (error) {
      console.error("Capture failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={loading}>
        Pay with PayPal
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Handling PayPal Redirects

```typescript
// In your success page component
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("token"); // PayPal returns token parameter
  const transactionId = urlParams.get("transactionId");

  if (orderId && transactionId) {
    captureOrder(orderId, transactionId);
  }
}, []);
```

## Webhook Integration

### PayPal Webhook Events Handled

- `PAYMENT.CAPTURE.COMPLETED` - Payment captured successfully
- `PAYMENT.CAPTURE.DENIED` - Payment capture denied
- `PAYMENT.CAPTURE.REFUNDED` - Payment refunded
- `PAYMENT.CAPTURE.REVERSED` - Payment reversed
- `CHECKOUT.ORDER.APPROVED` - Order approved (not yet captured)
- `CHECKOUT.ORDER.COMPLETED` - Order completed
- `CHECKOUT.ORDER.CANCELLED` - Order cancelled

### Webhook Security

Webhooks are verified using PayPal's signature verification:
- Headers: `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`, `paypal-cert-url`
- Webhook ID: `PAYPAL_WEBHOOK_ID`
- Signature verification via PayPal API

### Setting Up Webhooks

1. Go to PayPal Developer Dashboard
2. Navigate to Webhooks section
3. Create new webhook endpoint
4. URL: `https://yourdomain.com/api/abilitypay/payments/paypal/webhook`
5. Subscribe to events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CHECKOUT.ORDER.COMPLETED`
   - `CHECKOUT.ORDER.CANCELLED`
6. Copy webhook ID to environment variable

## Order Status Flow

```
CREATED → SAVED → APPROVED → COMPLETED
                ↓
            CANCELLED
```

- **CREATED**: Order created, awaiting approval
- **SAVED**: Order saved for later
- **APPROVED**: User approved, ready for capture
- **COMPLETED**: Payment captured and completed
- **CANCELLED**: Order cancelled by user

## Security Considerations

### PayPal Security
- OAuth 2.0 authentication
- Webhook signature verification
- HTTPS required for webhooks
- PCI compliance (handled by PayPal)

### Payment Flow Security
- Transaction amount validation
- Provider registration verification
- NDIS rule enforcement
- Order ID validation before capture

## Error Handling

### Order Creation Failures
- Invalid amount → 400 error
- Missing credentials → 500 error
- API errors → PayPal error messages returned

### Capture Failures
- Order not approved → 400 error
- Already captured → 400 error
- Insufficient funds → PayPal error

### Webhook Failures
- Invalid signature → Logged and rejected (production)
- Missing transaction → Logged and ignored
- Processing errors → Logged for investigation

## Testing

### Sandbox Testing
- Use PayPal sandbox accounts
- Test with various card scenarios
- Use PayPal webhook simulator
- Test cancellation flow

### Test Accounts
Create test accounts in PayPal sandbox:
- Personal account (buyer)
- Business account (merchant)
- Test credit cards provided by PayPal

### Webhook Testing
1. Use PayPal webhook simulator
2. Send test events to your endpoint
3. Verify webhook signature
4. Check transaction updates

## Monitoring

### Payment Success
- Track PayPal payment success rate
- Monitor webhook delivery
- Track order-to-capture conversion
- Monitor refund rates

### Error Tracking
- Log PayPal API errors
- Track webhook failures
- Monitor capture failures
- Track order cancellations

## Troubleshooting

### Order Not Created
1. Check PayPal credentials
2. Verify API endpoint accessibility
3. Check request format
4. Review PayPal API logs

### Capture Fails
1. Verify order is in APPROVED status
2. Check order hasn't been captured already
3. Verify PayPal account status
4. Check capture API response

### Webhook Not Received
1. Verify webhook URL is accessible
2. Check webhook ID matches
3. Review PayPal dashboard for delivery status
4. Check server logs for errors

### Payment Not Completing
1. Check webhook is processing correctly
2. Verify transaction update logic
3. Check database connection
4. Review error logs

## Best Practices

1. **Always verify webhook signatures**
2. **Handle all webhook event types**
3. **Implement idempotency for captures**
4. **Log all payment events**
5. **Handle PayPal redirects securely**
6. **Validate order status before capture**
7. **Implement retry logic for failed captures**
8. **Monitor webhook delivery**

## Future Enhancements

- PayPal Pay Later integration
- Subscription payments
- Recurring billing
- Multi-currency support
- Advanced fraud detection
- Payment method vaulting
