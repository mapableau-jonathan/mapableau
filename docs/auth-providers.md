# OAuth Provider Configuration Guide

This document contains exact callback URLs to register for each OAuth provider when configuring MapAble authentication.

## Callback URLs

All callback URLs follow the pattern: `${APP_BASE_URL}/api/auth/<provider>/callback`

### Production
- **Google**: `https://yourdomain.com/api/auth/google/callback`
- **Microsoft**: `https://yourdomain.com/api/auth/microsoft/callback`
- **Facebook**: `https://yourdomain.com/api/auth/facebook/callback`

### Development
- **Google**: `http://localhost:3000/api/auth/google/callback`
- **Microsoft**: `http://localhost:3000/api/auth/microsoft/callback`
- **Facebook**: `http://localhost:3000/api/auth/facebook/callback`

## Provider-Specific Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `${APP_BASE_URL}/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

**Scopes**: `profile`, `email` (configured automatically)

### Microsoft OAuth (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: "MapAble"
5. Supported account types:
   - **Accounts in any organizational directory and personal Microsoft accounts** (common)
   - **Accounts in any organizational directory** (organizations)
   - **Accounts in this organizational directory only** (single tenant)
6. Redirect URI: Platform "Web", URL: `${APP_BASE_URL}/api/auth/microsoft/callback`
7. Copy Application (client) ID and create a client secret
8. Set `MICROSOFT_TENANT_ID`:
   - `common` - All Microsoft accounts
   - `organizations` - Work/school accounts only
   - `consumers` - Personal accounts only
   - `{tenant-id}` - Specific tenant UUID

**Scopes**: `openid`, `profile`, `email` (configured automatically)

**Note**: Microsoft may require additional API permissions in production. Check "API permissions" in Azure Portal.

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing
3. Add "Facebook Login" product
4. Go to "Settings" → "Basic"
5. Add Platform: "Website"
6. Site URL: `${APP_BASE_URL}`
7. Valid OAuth Redirect URIs: `${APP_BASE_URL}/api/auth/facebook/callback`
8. Copy App ID and App Secret to `.env`

**Scopes**: `email` (configured automatically)

**Note**: Facebook requires app review for production access to email scope.

## Vercel Preview Deployments

⚠️ **Warning**: Vercel preview deployments use dynamic hostnames (e.g., `your-app-abc123.vercel.app`).

### Problem
OAuth providers require exact callback URL matches. Preview deployments change hostnames on each deployment.

### Solutions

1. **Use a stable development domain** (Recommended)
   - Configure a custom domain for development
   - Point it to your Vercel preview environment
   - Register this domain with all OAuth providers

2. **Separate OAuth apps for preview** (Alternative)
   - Create separate OAuth applications for preview deployments
   - Use different environment variables for preview vs production
   - Update callback URLs manually for each preview deployment

3. **Local development only** (Simplest for development)
   - Use `localhost:3000` for development
   - Only configure production callback URLs for production domain

### Recommended Setup

```env
# Production
APP_BASE_URL=https://mapable.com

# Preview/Staging
APP_BASE_URL=https://preview.mapable.com

# Development
APP_BASE_URL=http://localhost:3000
```

## Testing

After configuring each provider:

1. Visit `/login`
2. Click the provider button (should link to `/api/auth/<provider>`)
3. Complete OAuth flow
4. Should redirect to `/dashboard` with session set
5. Verify `/api/me` returns user data
6. Verify `/api/logout` clears session

## Troubleshooting

### "Redirect URI mismatch"
- Verify callback URL matches exactly (including protocol, domain, path)
- Check for trailing slashes
- Verify `APP_BASE_URL` environment variable is set correctly

### "Invalid client_id"
- Verify environment variables are loaded correctly
- Check for extra spaces or quotes in `.env` file
- Restart development server after changing `.env`

### "Email not available"
- **Facebook**: Requires app review for email scope in production
- **Microsoft**: Check API permissions in Azure Portal
- **Google**: Should work by default with profile+email scopes

### Microsoft-specific issues

1. **"AADSTS50020: User account not found"**
   - Check tenant ID configuration
   - Verify user account type matches tenant settings

2. **"AADSTS700016: Application not found"**
   - Verify client ID is correct
   - Check tenant ID matches app registration tenant

3. **Email field availability**
   - Microsoft may return email in `mail`, `email`, or `userPrincipalName`
   - Code handles all three fields automatically

## Security Notes

- Never commit `.env` file to version control
- Use strong `SESSION_PASSWORD` (minimum 32 characters)
- Rotate OAuth secrets regularly
- Monitor OAuth apps for unauthorized access
- Use HTTPS in production (required for secure cookies)
