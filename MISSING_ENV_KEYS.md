# Missing Environment Variables

This document lists all environment variables that are referenced in the codebase but may be missing from your `.env` file.

## Required Variables (Application won't work without these)

### Database
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@localhost:5432/abilitypay?schema=public`

### Authentication & Session
- `NEXTAUTH_URL` - Base URL of your application
  - Example: `http://localhost:3000`
- `NEXTAUTH_SECRET` - Secret key for NextAuth (must be at least 32 characters)
  - Generate with: `openssl rand -base64 32`

## Payment Gateway Variables

### Stripe (Required for Stripe payments)
- `STRIPE_SECRET_KEY` - Stripe secret API key
  - Get from: https://dashboard.stripe.com/apikeys
  - Format: `sk_test_...` or `sk_live_...`
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for frontend)
  - Format: `pk_test_...` or `pk_live_...`
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
  - Format: `whsec_...`
  - Get from: Stripe Dashboard > Webhooks

### PayPal (Required for PayPal payments)
- `PAYPAL_CLIENT_ID` - PayPal application client ID
  - Get from: https://developer.paypal.com/
- `PAYPAL_CLIENT_SECRET` - PayPal application client secret
- `PAYPAL_ENVIRONMENT` - PayPal environment (`sandbox` or `production`)
- `PAYPAL_WEBHOOK_ID` - PayPal webhook ID for signature verification

### NPP (New Payments Platform)
- `NPP_API_URL` - NPP API endpoint
  - Default: `https://api.npp.com.au`
- `NPP_API_KEY` - NPP API key
- `NPP_MERCHANT_ID` - NPP merchant identifier
- `NPP_WEBHOOK_SECRET` - NPP webhook secret
- `NPP_RETRY_ATTEMPTS` - Number of retry attempts (default: `3`)
- `NPP_RETRY_DELAY` - Retry delay in milliseconds (default: `1000`)

### Coinbase Commerce
- `COINBASE_API_KEY` - Coinbase Commerce API key
  - Get from: https://commerce.coinbase.com/
- `COINBASE_API_SECRET` - Coinbase Commerce API secret
- `COINBASE_API_URL` - Coinbase API URL (optional)
- `COINBASE_WEBHOOK_SECRET` - Coinbase webhook secret

## SMS & Communication

### Twilio (Required for SMS verification)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
  - Format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - Get from: https://console.twilio.com/
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
  - Format: `+1234567890`
- `TWILIO_VERIFY_SERVICE_SID` - Twilio Verify service SID
  - Format: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Google Maps & Mapping

### Google Maps API
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps JavaScript API key
  - Get from: https://console.cloud.google.com/
  - Note: Must be prefixed with `NEXT_PUBLIC_` for client-side access
- `GOOGLE_MAPS_ENABLED` - Enable Google Maps (`true` or `false`)
- `GOOGLE_MAPS_STREETVIEW_ENABLED` - Enable Street View (default: `true`)
- `GOOGLE_MAPS_3D_BUILDINGS_ENABLED` - Enable 3D buildings (default: `true`)
- `GOOGLE_MAPS_DEFAULT_ZOOM` - Default map zoom level (default: `13`)
- `GOOGLE_MAPS_DEFAULT_LAT` - Default latitude (default: `-33.8688`)
- `GOOGLE_MAPS_DEFAULT_LNG` - Default longitude (default: `151.2093`)
- `GOOGLE_MAPS_DEFAULT_TYPE` - Default map type (`roadmap`, `satellite`, `hybrid`, `terrain`)
- `GOOGLE_MAPS_3D_TILT` - 3D tilt angle (0-45 degrees, default: `45`)
- `GOOGLE_MAPS_3D_HEADING` - 3D heading/rotation (0-360 degrees, default: `0`)
- `GOOGLE_MAPS_MAP_TYPE_CONTROL` - Show map type control (`true` or `false`, default: `true`)

### Map Provider
- `NEXT_PUBLIC_DEFAULT_MAP_PROVIDER` - Default map provider (`google` or `leaflet`)
- `NEXT_PUBLIC_DEFAULT_AD_UNIT_ID` - Default ad unit ID for maps (default: `map_accessibility`)

## NDIA & NDIS Integration

### NDIA API
- `NDIA_API_URL` - NDIA API endpoint
  - Default: `https://api.ndia.gov.au`
- `NDIA_CLIENT_ID` - NDIA OAuth client ID
- `NDIA_CLIENT_SECRET` - NDIA OAuth client secret
- `NDIA_SCOPE` - NDIA OAuth scope
  - Default: `openid profile ndis.read`

### NDIS Commission
- `NDIS_COMMISSION_API_URL` - NDIS Commission API URL
- `NDIS_COMMISSION_API_KEY` - NDIS Commission API key

## Blockchain & Cryptocurrency

### Blockchain Provider
- `BLOCKCHAIN_PROVIDER` - Blockchain provider type
  - Options: `ethereum`, `hyperledger`, `polygon`, `mock`
  - Default: `mock`
- `BLOCKCHAIN_NETWORK_URL` - Blockchain network RPC URL
- `BLOCKCHAIN_PRIVATE_KEY` - Private key for blockchain transactions
- `BLOCKCHAIN_CONTRACT_ADDRESS` - Smart contract address

### Ethereum/MetaMask
- `ETHEREUM_RPC_URL` - Ethereum RPC endpoint
  - Example: `https://mainnet.infura.io/v3/your_infura_project_id`
- `POLYGON_RPC_URL` - Polygon RPC endpoint
  - Example: `https://polygon-rpc.com`

## WebAuthn & Biometric Authentication

- `WEBAUTHN_RP_ID` - Relying Party ID for WebAuthn
  - Falls back to `NEXT_PUBLIC_DOMAIN` or `localhost`
- `WEBAUTHN_RP_NAME` - Relying Party name
  - Default: `AbilityPay Protocol`
- `WEBAUTHN_ORIGIN` - WebAuthn origin URL
  - Falls back to `NEXT_PUBLIC_URL` or `http://localhost:3000`

## TOTP (Two-Factor Authentication)

- `TOTP_ISSUER` - TOTP issuer name
  - Default: `AbilityPay Protocol`

## Application Configuration

- `NODE_ENV` - Node environment
  - Options: `development`, `production`, `test`
  - Default: `development`
- `VERCEL_ENV` - Vercel environment (optional)
- `NEXT_PUBLIC_APP_URL` - Public application URL
  - Example: `http://localhost:3000`
- `NEXT_PUBLIC_URL` - Alternative public URL variable
- `NEXT_PUBLIC_DOMAIN` - Public domain name

## Feature Flags

- `ENABLE_WWCC` - Enable Working with Children Check verification
- `ENABLE_NDIS` - Enable NDIS features
- `ENABLE_FIRST_AID` - Enable First Aid verification

## Caching & Performance

### Redis (Optional - system works without it)
- `REDIS_URL` - Redis connection URL
  - Format: `redis://localhost:6379`
- `REDIS_PASSWORD` - Redis password (if required)

## Advertising System

- `AD_REVENUE_SHARE_PUBLISHER` - Publisher revenue share (default: `0.70`)
- `AD_REVENUE_SHARE_PLATFORM` - Platform revenue share (default: `0.30`)
- `AD_MINIMUM_PAYOUT` - Minimum payout amount in AUD (default: `100`)
- `AD_PAYMENT_FREQUENCY` - Payment frequency (`weekly`, `monthly`, `quarterly`)
- `AD_AUCTION_TYPE` - Auction type (`first_price` or `second_price`)
- `AD_MIN_BID` - Minimum bid amount (default: `0.01`)
- `AD_RESERVE_PRICE` - Reserve price for auctions (default: `0.01`)
- `AD_QUALITY_CTR_WEIGHT` - CTR weight for quality score (default: `0.4`)
- `AD_QUALITY_RELEVANCE_WEIGHT` - Relevance weight (default: `0.4`)
- `AD_QUALITY_LANDING_WEIGHT` - Landing page weight (default: `0.2`)
- `AD_FREQUENCY_CAPPING` - Enable frequency capping (`true` or `false`, default: `true`)
- `AD_FREQUENCY_CAP` - Maximum impressions per user per day (default: `10`)

## OAuth Providers (Optional)

### Google OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Facebook OAuth
- `FACEBOOK_CLIENT_ID` - Facebook OAuth app ID
- `FACEBOOK_CLIENT_SECRET` - Facebook OAuth app secret

### Azure AD OAuth
- `AZURE_AD_CLIENT_ID` - Azure AD application client ID
- `AZURE_AD_CLIENT_SECRET` - Azure AD application client secret
- `AZURE_AD_TENANT_ID` - Azure AD tenant ID

## AI Services (Optional)

- `OPENAI_API_KEY` - OpenAI API key
  - Format: `sk-...`
- `ANTHROPIC_API_KEY` - Anthropic API key
  - Format: `sk-ant-...`

## Legacy Variables

- `VITE_GOOGLE_MAPS_API_KEY` - Legacy Vite variable (may be used in some components)

---

## Quick Setup Checklist

### Minimum Required for Basic Functionality:
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`

### For Payment Processing (choose at least one):
- [ ] Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT`
- [ ] NPP: `NPP_API_KEY`, `NPP_MERCHANT_ID`
- [ ] Coinbase: `COINBASE_API_KEY`, `COINBASE_API_SECRET`

### For SMS Verification:
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `TWILIO_VERIFY_SERVICE_SID`

### For Google Maps:
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### For NDIA Integration:
- [ ] `NDIA_CLIENT_ID`
- [ ] `NDIA_CLIENT_SECRET`

---

## Notes

1. **Required vs Optional**: Variables marked as "Required" are needed for core functionality. Optional variables have defaults or the feature will be disabled if not provided.

2. **NEXT_PUBLIC_ prefix**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and should not contain sensitive information.

3. **Validation**: The application validates required environment variables at startup using the schema in `lib/config/env.ts`.

4. **Security**: Never commit your `.env` file to version control. Use `.env.example` as a template.

5. **Environment-specific**: Some variables may have different values for development, staging, and production environments.
