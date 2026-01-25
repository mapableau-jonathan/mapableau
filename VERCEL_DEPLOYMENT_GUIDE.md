# Vercel Deployment Guide

Complete guide for deploying MapAble to Vercel.

## Prerequisites

- GitHub account with repository access
- Vercel account (free tier available)
- PostgreSQL database (Neon, Supabase, or other)
- Required API keys and credentials

## Quick Start

### Step 1: Connect Repository to Vercel

1. **Sign in to Vercel**
   - Go to https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New Project" or "Import Project"
   - Select your repository: `mapableau-jonathan/mapableau`
   - Choose the branch: `2026-01-18-4a4a-984bf` (or your main branch)

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `pnpm build` (or leave default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install` (or leave default)

### Step 2: Configure Environment Variables

Add all required environment variables in Vercel Dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add each variable for **Production**, **Preview**, and **Development** environments

#### Required Variables

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# NextAuth (REQUIRED)
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key-minimum-32-characters

# Validation (Optional - set to false for production)
SKIP_ENV_VALIDATION=false
```

#### Payment Gateway Variables (Add as needed)

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENVIRONMENT=production
PAYPAL_WEBHOOK_ID=your_webhook_id

# Coinbase
COINBASE_API_KEY=your_api_key
COINBASE_API_SECRET=your_api_secret
COINBASE_WEBHOOK_SECRET=your_webhook_secret

# NPP
NPP_API_KEY=your_api_key
NPP_MERCHANT_ID=your_merchant_id
NPP_WEBHOOK_SECRET=your_webhook_secret
```

#### Communication Services

```env
# Twilio SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VA...

# Email (SendGrid or similar)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

#### Maps & Services

```env
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# AI Services (Optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

#### OAuth Providers (Add as needed)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Microsoft Azure AD
AZURE_AD_CLIENT_ID=your_azure_client_id
AZURE_AD_CLIENT_SECRET=your_azure_client_secret
AZURE_AD_TENANT_ID=your_tenant_id
```

#### NDIS Integration

```env
# NDIA Integration
NDIA_CLIENT_ID=your_ndia_client_id
NDIA_CLIENT_SECRET=your_ndia_client_secret

# NDIS MyPlace
NDIS_MYPLACE_CLIENT_ID=your_myplace_client_id
NDIS_MYPLACE_CLIENT_SECRET=your_myplace_client_secret
NDIS_MYPLACE_REDIRECT_URI=https://your-app.vercel.app/api/ndis/myplace/oauth/callback
```

### Step 3: Database Setup

#### Option A: Neon Database (Recommended)

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up and create a new project

2. **Get Connection String**
   - Copy your PostgreSQL connection string
   - Format: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

3. **Add to Vercel**
   - Add as `DATABASE_URL` in Vercel environment variables

#### Option B: Supabase

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project

2. **Get Connection String**
   - Go to Project Settings → Database
   - Copy connection string (URI format)

3. **Add to Vercel**
   - Add as `DATABASE_URL` in Vercel environment variables

#### Database Migration

After deploying, run Prisma migrations:

```bash
# Via Vercel CLI
vercel env pull .env.local
pnpm prisma migrate deploy

# Or via Vercel Dashboard
# Use Vercel CLI to run migrations after deployment
```

### Step 4: Deploy

1. **Review Configuration**
   - Check all environment variables are set
   - Verify build settings

2. **Deploy**
   - Click "Deploy" button
   - Wait for build to complete (usually 2-5 minutes)

3. **Monitor Build**
   - Watch build logs for any errors
   - Fix any issues and redeploy

### Step 5: Post-Deployment

#### 1. Update Webhook URLs

Update webhook URLs in external services:

**Stripe:**
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://your-app.vercel.app/api/abilitypay/payments/stripe/webhook`
- Copy webhook secret and add to Vercel as `STRIPE_WEBHOOK_SECRET`

**PayPal:**
- Go to PayPal Developer Dashboard
- Add webhook URL: `https://your-app.vercel.app/api/abilitypay/payments/paypal/webhook`
- Copy webhook ID and add to Vercel as `PAYPAL_WEBHOOK_ID`

**Coinbase:**
- Go to Coinbase Commerce Dashboard
- Add webhook URL: `https://your-app.vercel.app/api/abilitypay/payments/coinbase/webhook`
- Copy webhook secret and add to Vercel

#### 2. Update OAuth Redirect URIs

Update OAuth callback URLs in provider dashboards:

**Google:**
- Go to Google Cloud Console → APIs & Services → Credentials
- Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`

**Facebook:**
- Go to Facebook Developers → App Settings
- Add Valid OAuth Redirect URI: `https://your-app.vercel.app/api/auth/callback/facebook`

**Microsoft Azure:**
- Go to Azure Portal → App Registrations
- Add redirect URI: `https://your-app.vercel.app/api/auth/callback/microsoft`

#### 3. Update NEXTAUTH_URL

After deployment, update `NEXTAUTH_URL` in Vercel:
- Go to Settings → Environment Variables
- Update `NEXTAUTH_URL` to your actual Vercel URL: `https://your-app.vercel.app`

#### 4. Run Database Migrations

```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Run migrations
pnpm prisma migrate deploy

# Or generate Prisma client and push schema
pnpm prisma generate
pnpm prisma db push
```

### Step 6: Verify Deployment

1. **Test Application**
   - Visit your Vercel URL: `https://your-app.vercel.app`
   - Test authentication flow
   - Test API endpoints

2. **Check Logs**
   - Go to Vercel Dashboard → Deployments
   - Click on your deployment → Functions
   - Check for any runtime errors

3. **Monitor Performance**
   - Use Vercel Analytics (if enabled)
   - Check function execution times
   - Monitor database connections

## Build Configuration

The `vercel.json` file configures:

- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`
- **Framework**: Next.js
- **Regions**: `iad1` (US East)
- **Function Timeout**: 30 seconds for API routes
- **CORS Headers**: Configured for API routes

## Environment-Specific Configuration

### Production

Set `SKIP_ENV_VALIDATION=false` to ensure all required variables are validated.

### Preview (Pull Requests)

Use preview environment variables for testing:
- Different database (optional)
- Test API keys
- Preview-specific configuration

### Development

For local development:
- Use `.env.local` file
- Set `SKIP_ENV_VALIDATION=true` (optional)
- Use local database or development credentials

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Add all required variables in Vercel Dashboard
- Temporarily set `SKIP_ENV_VALIDATION=true` for testing

**Error: TypeScript errors**
- Solution: Fix TypeScript errors locally first
- Set `SKIP_ENV_VALIDATION=true` temporarily if needed

**Error: ESLint errors**
- Solution: Fix linting errors locally
- Or disable ESLint during builds: set `SKIP_ENV_VALIDATION=true`

### Runtime Errors

**Error: Database connection failed**
- Solution: Check `DATABASE_URL` is correct
- Verify database is accessible from Vercel IPs
- Check SSL mode if required

**Error: NEXTAUTH_URL mismatch**
- Solution: Update `NEXTAUTH_URL` to match your Vercel deployment URL
- Ensure it matches exactly (including https://)

**Error: Webhook verification failed**
- Solution: Verify webhook secrets match between Vercel and service providers
- Check webhook URLs are correct

### Performance Issues

**Slow API responses**
- Solution: Check function timeout settings in `vercel.json`
- Optimize database queries
- Consider using Vercel Edge Functions for simple operations

**Database connection limits**
- Solution: Use connection pooling (Neon, Supabase provide this)
- Optimize Prisma queries
- Consider using Vercel Postgres

## Continuous Deployment

Vercel automatically deploys on:

- **Push to main branch**: Production deployment
- **Pull requests**: Preview deployments
- **Manual deployment**: Via Vercel Dashboard

## Custom Domain

1. **Add Domain in Vercel**
   - Go to Settings → Domains
   - Add your custom domain

2. **Configure DNS**
   - Add CNAME record pointing to Vercel
   - Or use A records as instructed

3. **Update Environment Variables**
   - Update `NEXTAUTH_URL` to your custom domain
   - Update OAuth redirect URIs
   - Update webhook URLs

## Monitoring & Analytics

### Vercel Analytics

1. Enable in Project Settings → Analytics
2. View metrics in Vercel Dashboard

### Logs

- View real-time logs in Vercel Dashboard
- Function logs show API route execution
- Build logs show deployment process

## Security Best Practices

1. **Never commit secrets**
   - All secrets should be in Vercel environment variables
   - `.env` files are gitignored

2. **Use environment-specific variables**
   - Different values for production, preview, development

3. **Enable Vercel Security**
   - Enable DDoS protection
   - Use Vercel's built-in security features

4. **Regular updates**
   - Keep dependencies updated
   - Monitor security advisories

## Cost Optimization

### Vercel Free Tier Limits

- **Bandwidth**: 100GB/month
- **Function Executions**: 100GB-hours/month
- **Builds**: 100 builds/month

### Optimization Tips

1. **Use Edge Functions** for simple operations
2. **Optimize bundle size** to reduce bandwidth
3. **Cache static assets** using Vercel's CDN
4. **Use ISR** (Incremental Static Regeneration) where possible

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **Vercel Status**: https://vercel-status.com

## Quick Reference

### Essential Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull .env.local

# View deployments
vercel ls

# View logs
vercel logs
```

### Environment Variables Checklist

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Your Vercel deployment URL
- [ ] `NEXTAUTH_SECRET` - Generated secret (32+ characters)
- [ ] Payment gateway keys (Stripe, PayPal, etc.)
- [ ] OAuth provider credentials (Google, Facebook, etc.)
- [ ] Communication service keys (Twilio, SendGrid)
- [ ] Maps API key (Google Maps)
- [ ] Webhook secrets for all payment providers

## Next Steps

After successful deployment:

1. ✅ Test all authentication flows
2. ✅ Test payment processing
3. ✅ Verify webhook endpoints
4. ✅ Set up monitoring and alerts
5. ✅ Configure custom domain (optional)
6. ✅ Enable analytics
7. ✅ Set up backup and disaster recovery

---

**Deployment Status**: Ready for Vercel deployment

**Last Updated**: 2026-01-24
