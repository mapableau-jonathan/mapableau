# Stripe Tax Integration

The AbilityPay now includes Stripe Tax integration for automatic tax calculation and compliance.

## Overview

Stripe Tax automatically calculates, collects, and reports tax on payments. This integration ensures compliance with tax regulations in jurisdictions where you're registered to collect tax.

## Features

- **Automatic Tax Calculation**: Calculates tax based on customer address
- **Tax Breakdown**: Shows detailed tax breakdown by jurisdiction
- **Tax Transaction Recording**: Records tax transactions for reporting
- **Compliance**: Helps with tax filing and reporting requirements

## How It Works

1. **Tax Calculation**: When a payment is initiated with `calculateTax: true` and customer address, Stripe calculates applicable taxes
2. **Payment Amount**: The payment amount is adjusted to include tax
3. **Tax Recording**: After successful payment, a tax transaction is created for reporting
4. **Tax Breakdown**: Detailed tax information is displayed to the customer

## Configuration

### Prerequisites

1. **Stripe Tax Registration**: You must register for tax collection in jurisdictions where you operate
   - Go to Stripe Dashboard → Tax → Registrations
   - Add registrations for each jurisdiction

2. **Environment Variables**: No additional environment variables needed (uses existing Stripe keys)

### Enable Tax Calculation

Tax calculation is optional and can be enabled per payment:

```typescript
// In payment request
{
  calculateTax: true,
  customerAddress: {
    line1: "123 Main St",
    city: "Sydney",
    state: "NSW",
    postal_code: "2000",
    country: "AU"
  }
}
```

## API Usage

### Initiate Payment with Tax

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
  "calculateTax": true,
  "customerAddress": {
    "line1": "123 Main Street",
    "city": "Sydney",
    "state": "NSW",
    "postal_code": "2000",
    "country": "AU"
  }
}
```

Response includes tax calculation:

```json
{
  "transactionId": "txn_123",
  "paymentIntent": {
    "id": "pi_abc123",
    "clientSecret": "pi_abc123_secret_xyz",
    "status": "requires_payment_method"
  },
  "taxCalculation": {
    "id": "taxcalc_123",
    "taxAmountExclusive": 10.00,
    "taxAmountInclusive": 0.00,
    "amountTotal": 110.00,
    "taxBreakdown": [
      {
        "jurisdiction": "Australia - GST",
        "percentage": 10,
        "taxAmount": 10.00
      }
    ]
  },
  "smsVerification": {
    "sent": true,
    "verificationId": "verify_123",
    "expiresAt": "2024-01-01T12:10:00Z"
  }
}
```

## Frontend Integration

### StripePaymentForm Component

The `StripePaymentForm` component automatically displays tax information when available:

```tsx
<StripePaymentForm
  providerId="provider_123"
  serviceCode="01_001_0107_1_1"
  amount={100.00}
  categoryId="cat_789"
  calculateTax={true}
  customerAddress={{
    line1: "123 Main St",
    city: "Sydney",
    state: "NSW",
    postal_code: "2000",
    country: "AU"
  }}
  onSuccess={(transactionId) => {
    console.log("Payment successful:", transactionId);
  }}
/>
```

### Tax Display

The form automatically shows:
- Subtotal (original amount)
- Tax amount and breakdown
- Total amount (including tax)

## Tax Transaction Recording

After a successful payment, the system automatically:

1. Creates a tax transaction from the calculation
2. Stores the tax transaction ID in the payment transaction
3. Makes it available for tax reporting

### Webhook Integration

The webhook handler automatically creates tax transactions:

```typescript
// In payment_intent.succeeded webhook
if (paymentIntent.metadata?.tax_calculation_id) {
  const taxTransactionId = await stripeAdapter.createTaxTransaction(
    paymentIntent.metadata.tax_calculation_id,
    paymentIntent.id
  );
  // Tax transaction ID stored in payment transaction
}
```

## Tax Breakdown Details

The tax breakdown shows:
- **Jurisdiction**: Where the tax applies (e.g., "Australia - GST")
- **Percentage**: Tax rate (e.g., 10%)
- **Tax Amount**: Amount of tax in AUD

Example:
```
Subtotal: $100.00 AUD
Tax:
  Australia - GST (10%): $10.00
Total: $110.00 AUD
```

## Supported Jurisdictions

Stripe Tax supports tax calculation in many jurisdictions. Common ones for Australia:

- **GST (Goods and Services Tax)**: 10% standard rate
- Automatic calculation based on customer address
- Supports business and consumer transactions

For a full list of supported jurisdictions, see [Stripe Tax Documentation](https://docs.stripe.com/tax).

## Error Handling

### Tax Calculation Failures

If tax calculation fails:
- Payment proceeds without tax
- Warning logged but payment continues
- Customer pays original amount

### Invalid Address

If customer address is invalid:
- Returns `customer_tax_location_invalid` error
- Payment cannot proceed until address is corrected
- User should verify and correct address

## Testing

### Test Mode

In Stripe test mode:
- Tax calculations work but may not reflect real rates
- Limited to 1,000 calculations per day
- Use for integration testing

### Test Addresses

Use valid test addresses:
- Australia: Valid Australian addresses with postal codes
- Other countries: Valid addresses in supported jurisdictions

## Tax Reporting

### Stripe Dashboard

View tax transactions in:
- Stripe Dashboard → Tax → Transactions
- Detailed breakdown by jurisdiction
- Export for tax filing

### Tax Exports

Export tax data:
- CSV exports available
- Includes all tax transactions
- Organized by jurisdiction and date

## Best Practices

1. **Always Provide Address**: Include customer address for accurate tax calculation
2. **Register in Jurisdictions**: Register for tax collection where required
3. **Display Tax Clearly**: Show tax breakdown to customers
4. **Record Transactions**: Ensure tax transactions are created after payment
5. **Monitor Tax Rates**: Tax rates may change; Stripe updates automatically

## Compliance

### Tax Registration

- Register in Stripe Dashboard for each jurisdiction
- Provide business registration details
- Verify registration status

### Tax Filing

- Use Stripe Tax reports for filing
- Export transaction data
- Reconcile with your accounting system

## Troubleshooting

### Tax Not Calculating

1. Check tax registration in Stripe Dashboard
2. Verify customer address is complete and valid
3. Ensure `calculateTax: true` is set
4. Check Stripe API logs for errors

### Incorrect Tax Amount

1. Verify tax registration is active
2. Check customer address accuracy
3. Confirm tax rates in Stripe Dashboard
4. Review tax calculation response

### Tax Transaction Not Created

1. Check webhook is processing correctly
2. Verify tax calculation ID in payment intent metadata
3. Review webhook logs for errors
4. Ensure tax transaction creation succeeds

## Additional Resources

- [Stripe Tax Documentation](https://docs.stripe.com/tax)
- [Stripe Tax API Reference](https://docs.stripe.com/api/tax)
- [Tax Registration Guide](https://docs.stripe.com/tax/registrations)
- [Tax Reporting](https://docs.stripe.com/tax/reporting)
