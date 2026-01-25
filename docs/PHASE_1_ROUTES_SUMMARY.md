# MapAble Phase 1 - Complete Routes Summary

## Overview

This document provides a comprehensive list of all routes implemented in Phase 1, including both Pages Router API routes and App Router pages/API routes.

## Pages Router API Routes (`pages/api/`)

### Authentication Routes

#### Google OAuth
- **GET** `/api/auth/passport/google`
  - Description: Initiates Google OAuth login flow
  - Query Parameters:
    - `callback` (optional): Redirect URL after authentication
  - Returns: Redirects to Google OAuth consent screen
  - Auth Required: No

- **GET** `/api/auth/passport/google/callback`
  - Description: Handles Google OAuth callback
  - Query Parameters:
    - `code`: OAuth authorization code
    - `state`: State parameter (contains callback URL)
  - Returns: Redirects to callback URL with session created
  - Auth Required: No

#### Microsoft OAuth
- **GET** `/api/auth/passport/microsoft`
  - Description: Initiates Microsoft OAuth login flow
  - Query Parameters:
    - `callback` (optional): Redirect URL after authentication
  - Returns: Redirects to Microsoft OAuth consent screen
  - Auth Required: No

- **GET** `/api/auth/passport/microsoft/callback`
  - Description: Handles Microsoft OAuth callback
  - Query Parameters:
    - `code`: OAuth authorization code
    - `state`: State parameter (contains callback URL)
  - Returns: Redirects to callback URL with session created
  - Auth Required: No

#### Facebook OAuth
- **GET** `/api/auth/passport/facebook`
  - Description: Initiates Facebook OAuth login flow
  - Query Parameters:
    - `callback` (optional): Redirect URL after authentication
  - Returns: Redirects to Facebook OAuth consent screen
  - Auth Required: No

- **GET** `/api/auth/passport/facebook/callback`
  - Description: Handles Facebook OAuth callback
  - Query Parameters:
    - `code`: OAuth authorization code
    - `state`: State parameter (contains callback URL)
  - Returns: Redirects to callback URL with session created
  - Auth Required: No

#### Session Management
- **POST** `/api/auth/passport/logout`
  - Description: Destroys user session
  - Request Body: None
  - Returns: `{ success: true, message: "Logged out successfully" }`
  - Auth Required: Yes (session must exist)

- **GET** `/api/auth/passport/session`
  - Description: Returns current session data
  - Returns: `{ userId, email, name, role, image, provider, isLoggedIn }`
  - Auth Required: No (returns default session if not logged in)

### Admin Worker Routes

- **GET** `/api/admin/workers/pending`
  - Description: Returns list of workers awaiting verification
  - Returns: `{ workers: [...], count: number }`
  - Auth Required: Yes (Admin role)
  - Response includes:
    - Worker details (id, role, status)
    - User info (name, email, image)
    - Verification records
    - Admin verification status

- **POST** `/api/admin/workers/[workerId]/verify`
  - Description: Verify or reject a worker
  - Path Parameters:
    - `workerId`: Worker ID to verify
  - Request Body:
    ```json
    {
      "status": "approved" | "rejected",
      "notes": "string (optional)"
    }
    ```
  - Returns: `{ success: true, verification: {...} }`
  - Auth Required: Yes (Admin role)
  - Side Effects:
    - Updates worker status in database
    - Creates verification record in-memory store

## App Router Routes (`app/`)

### Pages

#### Public Pages
- **GET** `/workers`
  - Description: Public worker directory page
  - Features:
    - Search functionality
    - Display verified workers only
    - No sensitive data exposed
    - Accessible design
  - Auth Required: No

#### Authenticated Pages
- **GET** `/account/connected`
  - Description: Connected accounts management page
  - Features:
    - View connected OAuth accounts
    - Connect/disconnect accounts
    - Provider-specific icons
  - Auth Required: Yes

- **GET** `/admin/workers/verify`
  - Description: Admin worker verification UI
  - Features:
    - List pending workers
    - Review worker verifications
    - Approve/reject workers
    - Add verification notes
  - Auth Required: Yes (Admin role)

### API Routes (`app/api/`)

#### Worker Routes
- **GET** `/api/workers/public`
  - Description: Public API for verified workers
  - Returns: `{ workers: [...], count: number }`
  - Security:
    - Only returns VERIFIED workers
    - Never exposes email addresses
    - Never exposes document URLs
    - Never exposes verification metadata
    - Never exposes provider responses
  - Auth Required: No

#### Account Routes
- **GET** `/api/account/connected`
  - Description: Get user's connected OAuth accounts
  - Returns: `{ accounts: [...] }`
  - Auth Required: Yes

- **DELETE** `/api/account/connected/[provider]`
  - Description: Disconnect OAuth account
  - Path Parameters:
    - `provider`: OAuth provider (google, microsoft, facebook)
  - Returns: `{ success: true }`
  - Auth Required: Yes

## Route Protection

### Authentication Levels

1. **Public** - No authentication required
   - `/workers`
   - `/api/workers/public`
   - OAuth initiation routes
   - OAuth callback routes

2. **Authenticated** - Requires valid session
   - `/account/connected`
   - `/api/auth/passport/logout`
   - `/api/account/connected/*`

3. **Admin** - Requires authenticated session with NDIA_ADMIN role
   - `/admin/workers/verify`
   - `/api/admin/workers/*`

### Protection Methods

#### Server-Side (API Routes)
- `withRole()` middleware (`lib/middleware/role-middleware.ts`)
- Session validation via iron-session
- Role checking in route handlers

#### Client-Side (Pages)
- `ProtectedRoute` component (`components/auth/ProtectedRoute.tsx`)
- `useAuthGuard` hook (`hooks/use-auth-guard.ts`)
- Client-side session checks

## Data Flow

### OAuth Flow
```
User → /api/auth/passport/google
     → Google OAuth Consent
     → /api/auth/passport/google/callback
     → Passport Strategy
     → Database (create/update user)
     → iron-session (create session)
     → Redirect to callback URL
```

### Worker Verification Flow
```
Admin → /admin/workers/verify
      → GET /api/admin/workers/pending
      → Select worker
      → POST /api/admin/workers/[workerId]/verify
      → Update database
      → Store in verification store
      → Refresh list
```

### Public Worker Directory Flow
```
User → /workers
     → GET /api/workers/public
     → Filter verified workers
     → Display (no sensitive data)
```

## Security Considerations

### OAuth Security
- State parameter for CSRF protection
- Secure callback URLs
- Token storage in secure cookies
- No tokens exposed in client-side code

### Session Security
- HTTP-only cookies
- Secure cookies (HTTPS only in production)
- 7-day expiration
- SameSite=Lax for CSRF protection

### Data Exposure Protection
- Public API filters sensitive fields
- Middleware blocks direct upload access
- Only verified workers in public directory
- No document URLs in public responses

## Error Handling

### Authentication Errors
- 401: Authentication required
- 403: Insufficient permissions
- 500: Server error

### OAuth Errors
- Redirects to `/login?error=oauth_failed`
- Redirects to `/login?error=session_failed`

### Validation Errors
- 400: Invalid request body
- 404: Resource not found

## Rate Limiting

All API routes are protected by rate limiting middleware:
- General API routes: Standard rate limit
- Payment routes: Stricter rate limit
- Configurable via environment variables

## Testing

Test coverage includes:
- OAuth flow tests (`__tests__/auth/passport-oauth.test.ts`)
- Verification store tests (`__tests__/workers/verification.test.ts`)
- Public directory security tests (`__tests__/workers/public-directory.test.ts`)

## Future Enhancements

- Migrate verification store to database
- Add pagination to public worker directory
- Implement worker profile pages
- Add email notifications
- Enhance search functionality
- Add filtering options
