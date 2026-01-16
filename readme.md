# OptimiseMe

A Next.js application built with TypeScript.

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Authentication**: NextAuth.js with OAuth providers (Google, Facebook, Microsoft Azure AD)
- **Database**: PostgreSQL with Prisma ORM
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Git Hooks**: Husky with lint-staged

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.12.1 or higher)
- PostgreSQL database
- OAuth app credentials (Google, Facebook, Microsoft Azure AD)

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mapableau?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# Google OAuth
# Get credentials from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Facebook OAuth
# Get credentials from: https://developers.facebook.com/apps/
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"

# Microsoft Azure AD (for Teams/Office 365)
# Get credentials from: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
AZURE_AD_CLIENT_ID="your-azure-ad-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-ad-client-secret"
AZURE_AD_TENANT_ID="common" # Use "common" for multi-tenant, or your specific tenant ID

# Worker Verification Providers

# Identity Verification (choose one)
IDENTITY_PROVIDER="chandler" # or "privy"
CHANDLER_VERIFY_API_KEY="your-chandler-api-key"
CHANDLER_VERIFY_API_URL="https://api.chandlerverify.com.au"
# OR
PRIVY_API_KEY="your-privy-api-key"
PRIVY_API_URL="https://api.privy.com.au"

# VEVO/Work Rights (choose one)
VEVO_PROVIDER="vsure" # or "checkworkrights"
VSURE_API_KEY="your-vsure-api-key"
VSURE_API_URL="https://api.vsure.com.au"
# OR
CHECKWORKRIGHTS_API_KEY="your-checkworkrights-api-key"
CHECKWORKRIGHTS_API_URL="https://api.checkworkrights.com.au"

# WWCC Verification
OHO_API_KEY="your-oho-api-key"
OHO_API_URL="https://api.weareoho.com"
OHO_WEBHOOK_SECRET="your-oho-webhook-secret"

# NDIS Portal (manual verification)
NDIS_PORTAL_USERNAME="your-ndis-portal-username"
NDIS_PORTAL_PASSWORD="your-ndis-portal-password"
NDIS_EMPLOYER_ID="your-ndis-employer-id"
NDIS_PORTAL_URL="https://portal.ndiscommission.gov.au"

# First Aid Verification (USI)
USI_API_KEY="your-usi-api-key"
USI_API_URL="https://api.usi.gov.au"

# Webhook Secrets
VEVO_WEBHOOK_SECRET="your-vevo-webhook-secret"

# Cron Job Secret (for scheduled monitoring)
CRON_SECRET="your-cron-secret"

# Feature Flags
ENABLE_WWCC="true"
ENABLE_NDIS="true"
ENABLE_FIRST_AID="true"
```

### OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env` file

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create a new app
3. Add "Facebook Login" product
4. Set Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/callback/facebook`
5. Copy the App ID and App Secret to your `.env` file

#### Microsoft Azure AD
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Create a new registration
4. Set redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
5. Create a client secret
6. Copy the Application (client) ID, Directory (tenant) ID, and client secret to your `.env` file

### Database Setup

```bash
# Run migrations
pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate
```

### Worker Verification Provider Setup

The application integrates with multiple Australian verification services. You'll need to sign up and obtain API keys from:

#### Identity Verification
- **Chandler Verify**: https://www.chandlerverify.com.au/
- **Privy**: https://privy.com.au/

#### VEVO/Work Rights
- **vSure**: https://www.vsure.com.au/
- **CheckWorkRights**: https://checkworkrights.com.au/

#### WWCC Verification
- **Oho API**: https://docs.weareoho.com/ (Contact for API access)

#### NDIS Worker Screening
- Access via NDIS Commission portal (no API available)
- Register at: https://www.ndiscommission.gov.au/

#### First Aid Verification
- **USI (Unique Student Identifier)**: https://www.usi.gov.au/
- Manual verification also supported via certificate upload

### Scheduled Jobs

Set up a cron job to run verification monitoring:

```bash
# Example cron job (runs daily at 2 AM)
0 2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/verification-monitor
```

Or use Vercel Cron (add to `vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/verification-monitor",
    "schedule": "0 2 * * *"
  }]
}
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Build

Build the application for production:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production (includes type-check and lint)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

## Project Structure

```
├── app/              # Next.js App Router pages and layouts
├── components/       # Reusable React components
├── lib/              # Utility functions and helpers
├── public/           # Static assets
└── ...
```

## Code Quality

This project uses:

- **ESLint** for code linting with strict TypeScript rules
- **Prettier** for code formatting
- **Husky** for git hooks (pre-commit and pre-push)
- **lint-staged** for running linters on staged files

Pre-commit hooks will automatically format and lint your code before commits.

## License

ISC
