# OAuth Providers (NextAuth)

This app uses **NextAuth** for web OAuth and **Passport** for API bearer tokens. See [AUTH.md](./AUTH.md) for the full stack.

Supported sign-in methods:

- **Google**
- **Facebook**
- **Microsoft** (Azure AD)
- **Auth0**
- **Email & password** (credentials)

Providers are enabled only when their env vars are set. Configure any subset you need.

## Environment variables

Add to `.env` (or `.env.local`):

```bash
# Auth0 (optional)
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
# AUTH0_ISSUER=https://ad-id.auth0.com

# Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Microsoft (Azure AD)
AZURE_AD_CLIENT_ID=your_azure_app_client_id
AZURE_AD_CLIENT_SECRET=your_azure_app_client_secret
AZURE_AD_TENANT_ID=common
```

## Callback URLs

Configure these redirect URIs in each provider’s developer console:

| Provider   | Callback URL                                                |
|-----------|--------------------------------------------------------------|
| Auth0     | `https://your-domain.com/api/auth/callback/auth0`           |
| Google    | `https://your-domain.com/api/auth/callback/google`          |
| Facebook  | `https://your-domain.com/api/auth/callback/facebook`        |
| Microsoft | `https://your-domain.com/api/auth/callback/azure-ad`        |

For local dev, also add:

- `http://localhost:3002/api/auth/callback/auth0`
- `http://localhost:3002/api/auth/callback/google`
- `http://localhost:3002/api/auth/callback/facebook`
- `http://localhost:3002/api/auth/callback/azure-ad`

Replace `your-domain.com` with your production and staging domains (e.g. `accessibooks2.vercel.app`).

## Provider setup

### Auth0

1. Create a Regular Web Application in [Auth0 Dashboard](https://manage.auth0.com/).
2. Add the callback and logout URLs above.
3. Copy Client ID and Client Secret into env vars.

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID.
2. Application type: Web application.
3. Add authorized redirect URIs (callback URLs above).
4. Copy Client ID and Client Secret into env vars.

### Facebook

1. [Facebook Developers](https://developers.facebook.com/) → Create App → Facebook Login → Web.
2. Add Valid OAuth Redirect URIs (callback URLs above).
3. Copy App ID and App Secret into env vars.

### Microsoft (Azure AD)

1. [Azure Portal](https://portal.azure.com/) → Azure Active Directory → App registrations → New registration.
2. Supported account types: e.g. “Accounts in any organizational directory and personal Microsoft accounts”.
3. Add a Web redirect URI (callback URL above).
4. Create a client secret under Certificates & secrets.
5. Copy Application (client) ID, Directory (tenant) ID, and client secret into env vars. Use `AZURE_AD_TENANT_ID=common` for multi-tenant, or your tenant ID for single-tenant.

## Flow

- **OAuth sign-in**: User clicks a social button on `/login` → redirects to the provider → after consent, provider redirects to the callback URL → NextAuth creates a JWT session and redirects to `callbackUrl` (default `/dashboard`).
- **Email sign-in**: Uses the credentials provider (email/password against your database).

Session `user.id` for OAuth users is the provider’s subject (`sub`) claim.
