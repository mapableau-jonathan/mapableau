# AbilityPay WebObjects Payment Terminal

An embeddable payment terminal component for accepting NDIS and Human Services payments on external websites.

## Features

- **Terminal-style UI**: Retro terminal aesthetic with customizable themes
- **Multiple Payment Methods**: Supports Stripe, PayPal, Blockchain, and Coinbase
- **NDIS & Human Services**: Handles both NDIS plan-based payments and Human Services payments
- **SMS Verification**: Optional SMS verification for enhanced security
- **Tax Calculation**: Automatic tax calculation for applicable regions
- **Embeddable**: Easy integration via script tag or React component
- **Responsive**: Works on desktop, tablet, and mobile devices

## Quick Start

### Option 1: Embed Script (External Websites)

Add the embed script to your HTML page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Payment Terminal</title>
</head>
<body>
  <!-- Terminal container -->
  <div 
    id="abilitypay-terminal" 
    data-config='{
      "providerId": "provider-id-here",
      "amount": 100,
      "serviceCode": "01_001_0107_1_1",
      "serviceDescription": "Support Worker Service",
      "categoryId": "category-id-here",
      "serviceType": "NDIS",
      "paymentMethods": ["stripe", "paypal"],
      "theme": "terminal",
      "size": "standard"
    }'
  ></div>

  <!-- Embed script -->
  <script src="https://your-domain.com/webobjects-terminal.js"></script>
</body>
</html>
```

### Option 2: React Component (Next.js/React)

```tsx
import { WebObjectsPaymentTerminal } from "@/components/abilitypay/webobjects-payment-terminal";

export default function PaymentPage() {
  return (
    <WebObjectsPaymentTerminal
      providerId="provider-id-here"
      amount={100}
      serviceCode="01_001_0107_1_1"
      serviceDescription="Support Worker Service"
      categoryId="category-id-here"
      serviceType="NDIS"
      paymentMethods={["stripe", "paypal", "blockchain"]}
      theme="terminal"
      size="standard"
      onSuccess={(transactionId, result) => {
        console.log("Payment successful:", transactionId);
      }}
      onError={(error) => {
        console.error("Payment error:", error);
      }}
    />
  );
}
```

## Configuration Options

### Required Parameters

- `providerId` (string): The NDIS provider ID receiving the payment
- `amount` (number): Payment amount in AUD

### Optional Parameters

#### Payment Details
- `serviceCode` (string): NDIS service code (e.g., "01_001_0107_1_1")
- `serviceDescription` (string): Description of the service
- `categoryId` (string): Budget category ID (required for NDIS payments)
- `workerId` (string): Worker ID if applicable
- `serviceType` ("NDIS" | "HUMAN_SERVICES"): Type of service (default: "NDIS")

#### Payment Methods
- `paymentMethods` (array): Available payment methods: `["stripe", "paypal", "blockchain", "coinbase"]` (default: `["stripe", "paypal", "blockchain"]`)
- `defaultPaymentMethod` (string): Default selected payment method

#### Appearance
- `theme` ("light" | "dark" | "terminal"): UI theme (default: "terminal")
- `size` ("compact" | "standard" | "large"): Terminal size (default: "standard")
- `showLogo` (boolean): Show AbilityPay logo (default: true)
- `brandName` (string): Custom brand name (default: "AbilityPay")

#### Configuration
- `apiBaseUrl` (string): API base URL (default: "/api")
- `enableTaxCalculation` (boolean): Enable tax calculation (default: true)
- `enableSMSVerification` (boolean): Enable SMS verification for Stripe (default: true)
- `requireAuth` (boolean): Require user authentication (default: true)

## Payment Flow

1. **Method Selection**: User selects payment method (Stripe, PayPal, Blockchain, etc.)
2. **Payment Details**: User enters email and phone (if required)
3. **Verification**: SMS verification code sent (if enabled for Stripe)
4. **Processing**: Payment is processed through selected gateway
5. **Confirmation**: Success or error message displayed

## API Integration

The terminal uses the following API endpoints:

### Initiate Payment
```
POST /api/abilitypay/payments/terminal
```

Request body:
```json
{
  "providerId": "provider-id",
  "amount": 100,
  "serviceCode": "01_001_0107_1_1",
  "categoryId": "category-id",
  "paymentMethod": "stripe",
  "email": "user@example.com",
  "phone": "+61412345678"
}
```

### Get Payment Status
```
GET /api/abilitypay/payments/terminal/status?transactionId=tx-id
```

## Callbacks

### onSuccess
Called when payment is successfully completed.

```tsx
onSuccess={(transactionId, result) => {
  // Handle successful payment
  console.log("Transaction ID:", transactionId);
  console.log("Payment result:", result);
}}
```

### onError
Called when payment fails.

```tsx
onError={(error) => {
  // Handle payment error
  console.error("Error:", error);
}}
```

### onCancel
Called when user cancels the payment.

```tsx
onCancel={() => {
  // Handle cancellation
  console.log("Payment cancelled");
}}
```

## Themes

### Terminal Theme
Classic terminal aesthetic with black background and green text.

```tsx
theme="terminal"
```

### Light Theme
Clean white background with dark text.

```tsx
theme="light"
```

### Dark Theme
Dark background with light text.

```tsx
theme="dark"
```

## Security

- All payments are processed through secure API endpoints
- User authentication required by default
- SMS verification for high-value transactions
- Payment data encrypted in transit
- PCI DSS compliant payment processors (Stripe, PayPal)

## Examples

### Basic NDIS Payment

```tsx
<WebObjectsPaymentTerminal
  providerId="provider-123"
  amount={150.00}
  serviceCode="01_001_0107_1_1"
  categoryId="cat-123"
  serviceDescription="Support Worker - 2 hours"
/>
```

### Human Services Payment

```tsx
<WebObjectsPaymentTerminal
  providerId="provider-123"
  amount={250.00}
  serviceType="HUMAN_SERVICES"
  serviceDescription="Consultation Services"
  paymentMethods={["stripe", "paypal"]}
/>
```

### Custom Styled Terminal

```tsx
<WebObjectsPaymentTerminal
  providerId="provider-123"
  amount={100}
  categoryId="cat-123"
  theme="terminal"
  size="large"
  brandName="My Service"
  showLogo={true}
/>
```

## Embed Script Events

When using the embed script, you can listen for payment events:

```javascript
// Payment success
window.addEventListener('message', function(event) {
  if (event.data.type === 'abilitypay-payment-success') {
    console.log('Payment successful:', event.data.transactionId);
  }
});

// Payment error
window.addEventListener('message', function(event) {
  if (event.data.type === 'abilitypay-payment-error') {
    console.error('Payment error:', event.data.error);
  }
});

// Payment cancelled
window.addEventListener('message', function(event) {
  if (event.data.type === 'abilitypay-payment-cancel') {
    console.log('Payment cancelled');
  }
});
```

## Troubleshooting

### Authentication Required
If `requireAuth` is enabled (default), users must be logged in. Ensure your authentication system is properly configured.

### Missing Category ID
NDIS payments require a `categoryId`. Ensure you have an active NDIS plan with budget categories.

### Payment Method Not Available
Verify that the selected payment method is configured and enabled in your environment variables.

### CORS Issues
If embedding on external domains, ensure CORS headers are properly configured on your API endpoints.

## Support

For issues or questions, contact the AbilityPay support team or refer to the main documentation.
