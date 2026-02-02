# Auth0 Setup Guide for MapAble

## Overview

Auth0 serves as the **Organizational Launchpad** for Australian Disability Ltd, providing federated SSO authentication. User data is stored in Neon PostgreSQL as the authentication sub-processor.

## Configuration Steps

### 1. Auth0 Dashboard Configuration

1. Log in to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → **Applications**
3. Select your application (or create a new "Regular Web Application")
4. Go to **Settings**

### 2. Required Settings

**Application Type**: Regular Web Application (not Single Page Application)

**Allowed Callback URLs**:
```
http://localhost:3000/api/auth/callback/auth0
https://yourdomain.com/api/auth/callback/auth0
```

**Allowed Logout URLs**:
```
http://localhost:3000
https://yourdomain.com
```

**Allowed Web Origins**:
```
http://localhost:3000
https://yourdomain.com
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Auth0 for Australian Disability Ltd (Organizational Launchpad)
AUTH0_CLIENT_ID=your-client-id-from-auth0-dashboard
AUTH0_CLIENT_SECRET=XKY92qZllG4XPJcAA68D9VYb-hxOGv4DnieTxPWIdc5jucSM8yEjGknCGMQAml1r
AUTH0_ISSUER=https://ad-id.au.auth0.com
AUTH0_AUDIENCE=your-api-audience (optional, if using Auth0 API)

# NextAuth Base URL (REQUIRED)
NEXTAUTH_URL=http://localhost:3000  # Development
# NEXTAUTH_URL=https://yourdomain.com  # Production
```

### 4. Getting Your Client ID

1. In Auth0 Dashboard → Applications → Your Application
2. Copy the **Client ID** from the Settings page
3. Add it to your `.env` file as `AUTH0_CLIENT_ID`

### 5. Verify Configuration

The callback URL format for NextAuth is:
- **Development**: `http://localhost:3000/api/auth/callback/auth0`
- **Production**: `https://yourdomain.com/api/auth/callback/auth0`

**Important**: 
- NextAuth automatically constructs the callback URL from `NEXTAUTH_URL`
- Make sure `NEXTAUTH_URL` matches your actual application URL
- The callback URL in Auth0 Dashboard must **exactly match** the NextAuth callback URL

## Troubleshooting Error -102

Error -102 typically indicates a network/connection issue. Common causes:

1. **Callback URL Mismatch**: 
   - Verify the callback URL in Auth0 Dashboard exactly matches: `${NEXTAUTH_URL}/api/auth/callback/auth0`
   - Check that `NEXTAUTH_URL` is set correctly in `.env`

2. **Missing Environment Variables**:
   - Ensure `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, and `AUTH0_ISSUER` are all set
   - Restart the development server after adding environment variables

3. **Auth0 Application Type**:
   - Must be "Regular Web Application", not "Single Page Application"
   - Check in Auth0 Dashboard → Applications → Settings → Application Type

4. **Network/CORS Issues**:
   - Verify Auth0 domain `ad-id.au.auth0.com` is accessible
   - Check browser console for CORS errors
   - Ensure no firewall/proxy is blocking Auth0 requests

5. **NextAuth Configuration**:
   - Verify `NEXTAUTH_SECRET` is set (required for JWT signing)
   - Check that `NEXTAUTH_URL` matches your actual application URL

## Testing

1. Start your development server: `npm run dev`
2. Navigate to your application
3. Click the Account button in TopBar
4. Click "AD Ltd" button in the Login tab
5. You should be redirected to Auth0 login page
6. After authentication, you'll be redirected back to your app

## Architecture

- **Auth0**: Organizational Launchpad (handles authentication)
- **Neon Database**: Authentication sub-processor (stores user data via PrismaAdapter)
- **NextAuth**: Handles OAuth flow and session management

## Support

If issues persist:
1. Check Auth0 Dashboard → Monitoring → Logs for errors
2. Check NextAuth logs in your application console
3. Verify all environment variables are set correctly
4. Ensure the Auth0 application is active in the dashboard
