# Environment Variables Setup Guide

This guide explains how to configure environment variables for the AbilityPay Protocol, including Stripe API keys.

## Quick Start: Stripe API Key

To add your Stripe API key, create a `.env` file in the root directory with:

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Complete Environment Variables

### Required for Stripe Integration

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                    # Secret key from Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_...               # Publishable key (for frontend)
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook signing secret
```

### Getting Stripe API Keys

1. **Sign up for Stripe**: https://stripe.com
2. **Access Dashboard**: https://dashboard.stripe.com
3. **Get API Keys**: 
   - Go to **Developers** → **API keys**
   - Copy your **Secret key** (starts with `sk_test_` for test mode)
   - Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. **Set up Webhook**:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - URL: `https://yourdomain.com/api/abilitypay/payments/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, etc.
   - Copy the **Signing secret** (starts with `whsec_`)

### All Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ============================================
# Database Configuration
# ============================================
DATABASE_URL="postgresql://user:password@localhost:5432/abilitypay?schema=public"

# ============================================
# Authentication & Session
# ============================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# ============================================
# Stripe Configuration (REQUIRED for Stripe payments)
# ============================================
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_signing_secret_here"

# ============================================
# Twilio SMS Configuration (REQUIRED for SMS verification)
# ============================================
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_twilio_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_VERIFY_SERVICE_SID="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# PayPal Configuration
# ============================================
PAYPAL_CLIENT_ID="your_paypal_client_id_here"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret_here"
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id_here"

# ============================================
# Coinbase Commerce Configuration
# ============================================
COINBASE_API_KEY="your_coinbase_api_key_here"
COINBASE_API_SECRET="your_coinbase_api_secret_here"
COINBASE_WEBHOOK_SECRET="your_coinbase_webhook_secret_here"

# ============================================
# Blockchain Configuration
# ============================================
BLOCKCHAIN_PROVIDER="mock"
BLOCKCHAIN_NETWORK_URL=""
BLOCKCHAIN_PRIVATE_KEY=""
BLOCKCHAIN_CONTRACT_ADDRESS=""
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/your_infura_project_id"
POLYGON_RPC_URL="https://polygon-rpc.com"

# ============================================
# NPP (New Payments Platform) Configuration
# ============================================
NPP_API_URL="https://api.npp.com.au"
NPP_API_KEY="your_npp_api_key_here"
NPP_MERCHANT_ID="your_npp_merchant_id_here"

# ============================================
# Application Configuration
# ============================================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# Redis Configuration (Optional)
# ============================================
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# ============================================
# Google Maps API
# ============================================
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# ============================================
# AI Services (Optional)
# ============================================
OPENAI_API_KEY="sk-your_openai_api_key_here"
ANTHROPIC_API_KEY="sk-ant-your_anthropic_api_key_here"
```

## Setup Instructions

### 1. Create `.env` File

In the project root directory, create a file named `.env`:

```bash
# Windows PowerShell
New-Item -Path .env -ItemType File

# Linux/Mac
touch .env
```

### 2. Add Stripe API Keys

Open the `.env` file and add your Stripe credentials:

```env
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### 3. Test vs Production Keys

- **Test Mode**: Keys start with `sk_test_` and `pk_test_`
  - Use for development and testing
  - No real charges are processed
  
- **Production Mode**: Keys start with `sk_live_` and `pk_live_`
  - Use for production
  - Real charges are processed
  - Requires Stripe account activation

### 4. Verify Configuration

After adding your Stripe API key, restart your development server:

```bash
npm run dev
```

The Stripe adapter will automatically use the `STRIPE_SECRET_KEY` from your `.env` file.

## Security Best Practices

1. **Never commit `.env` to version control**
   - The `.gitignore` file already excludes `.env` files
   - Always use `.env.example` as a template (without real keys)

2. **Use different keys for different environments**
   - Development: Test keys
   - Staging: Test keys
   - Production: Live keys

3. **Rotate keys regularly**
   - If a key is compromised, regenerate it in Stripe Dashboard
   - Update all environments immediately

4. **Use environment-specific files**
   - `.env.development.local` for local development
   - `.env.production` for production (set via hosting platform)

## Troubleshooting

### Error: "Stripe API key not configured"

**Solution**: Make sure:
1. `.env` file exists in the project root
2. `STRIPE_SECRET_KEY` is set in the file
3. No extra spaces or quotes around the key
4. Server has been restarted after adding the key

### Error: "Invalid API Key"

**Solution**: 
1. Verify the key is copied correctly (no extra characters)
2. Check if you're using test keys in test mode
3. Ensure the key hasn't been revoked in Stripe Dashboard

### Webhook Not Working

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
2. Check webhook endpoint URL is accessible
3. Verify webhook is configured in Stripe Dashboard
4. Check webhook events are subscribed correctly

## Next Steps

After configuring Stripe:

1. **Test the integration**: Use test cards from Stripe documentation
2. **Set up webhooks**: Configure webhook endpoint in Stripe Dashboard
3. **Review documentation**: See `docs/STRIPE_TWILIO_INTEGRATION.md` for detailed integration guide

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Dashboard](https://dashboard.stripe.com)
