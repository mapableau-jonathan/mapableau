# OAuth Passport Implementation Summary

## Files Created/Modified

### Core Implementation Files

1. **`lib/types/session.ts`** (NEW)
   - Defines `SessionUser` type with minimal payload
   - Provider type definitions

2. **`lib/passport.ts`** (NEW)
   - `initPassport()` singleton function (prevents multiple init in serverless)
   - Google, Microsoft, and Facebook strategies
   - Normalizes profiles to `SessionUser` format
   - No tokens stored (only user profile data)

3. **`lib/api.ts`** (NEW)
   - `createHandler()` factory using next-connect
   - `withSession()` wrapper for iron-session
   - `requireAuth()` middleware helper
   - Type augmentation for Next.js API routes

4. **`lib/session/config.ts`** (MODIFIED)
   - Changed cookie name from `mapable-session` to `mapable.sid`
   - Added `SESSION_PASSWORD` environment variable support

### API Routes (Pages Router)

5. **`pages/api/auth/google.ts`** (NEW)
   - Initiates Google OAuth flow

6. **`pages/api/auth/google/callback.ts`** (NEW)
   - Handles Google OAuth callback
   - Sets `req.session.user` and redirects to `/dashboard`

7. **`pages/api/auth/microsoft.ts`** (NEW)
   - Initiates Microsoft OAuth flow

8. **`pages/api/auth/microsoft/callback.ts`** (NEW)
   - Handles Microsoft OAuth callback
   - Sets `req.session.user` and redirects to `/dashboard`

9. **`pages/api/auth/facebook.ts`** (NEW)
   - Initiates Facebook OAuth flow

10. **`pages/api/auth/facebook/callback.ts`** (NEW)
    - Handles Facebook OAuth callback
    - Sets `req.session.user` and redirects to `/dashboard`

11. **`pages/api/me.ts`** (NEW)
    - Returns current session user
    - Returns 401 if not authenticated

12. **`pages/api/logout.ts`** (NEW)
    - Destroys session
    - POST endpoint

### Pages

13. **`pages/dashboard.tsx`** (NEW)
    - Displays user information from session
    - Fetches from `/api/me`
    - Shows name, email, provider, roles, verification status
    - Redirects to `/login` if unauthenticated
    - Logout button

### Components

14. **`components/auth/social-login-buttons.tsx`** (MODIFIED)
    - Updated to use `/api/auth/{provider}` endpoints
    - Removed serviceId parameter (not needed for direct Passport routes)

### Configuration

15. **`.env.example`** (NEW)
    - All required environment variables
    - Documentation for each variable

16. **`docs/auth-providers.md`** (NEW)
    - Exact callback URLs for each provider
    - Provider-specific configuration instructions
    - Vercel preview deployment warnings
    - Troubleshooting guide

### Package Updates

17. **`package.json`** (MODIFIED)
    - Added `next-connect` dependency

## Provider-Specific Quirks Discovered

### Google OAuth
- ✅ Straightforward implementation
- ✅ Email always available in `profile.emails[0].value`
- ✅ Display name available in `profile.displayName`
- ✅ No special handling needed

### Microsoft OAuth
- ⚠️ **Uses OAuth2Strategy** (no dedicated `passport-microsoft` package)
- ⚠️ **Profile handling**: Standard OAuth2Strategy doesn't provide profile in callback
- ✅ **Solution**: Decode ID token from `params.id_token` OR fetch from Microsoft Graph API
- ✅ **Email fields**: May be in `mail`, `email`, or `userPrincipalName`
- ✅ **Tenant ID**: Supports `common`, `organizations`, `consumers`, or specific tenant UUID
- ⚠️ **Account selection**: `prompt=select_account` can be added if supported by tenant

**Implementation Note**: The code attempts to decode the ID token first (faster), then falls back to Graph API fetch if needed. This handles both ID token and access token scenarios.

### Facebook OAuth
- ⚠️ **Email scope**: Requires app review for production access
- ✅ Email available in `profile.emails[0].value` after review
- ✅ Display name available in `profile.displayName`
- ✅ Profile fields configured: `id`, `displayName`, `email`, `name`

## Session Structure

The minimal session payload stored in `req.session.user`:

```typescript
{
  id: string;              // Provider profile ID
  provider: "google" | "microsoft" | "facebook";
  email?: string;          // Optional - may not be available
  name?: string;           // Optional - may not be available
  roles: ["participant"];  // Default role
  verificationStatus: "unverified"; // Default status
  linkedProviders?: [];    // Future: track other providers
}
```

**Important**: No OAuth access tokens or refresh tokens are stored in the session cookie.

## Testing Checklist

### Local Testing
- [ ] Visit `/login` and click Google button → Should redirect to Google OAuth
- [ ] Complete Google OAuth → Should redirect to `/dashboard`
- [ ] Visit `/api/me` → Should return `SessionUser` with Google provider
- [ ] Visit `/login` and click Microsoft button → Should redirect to Microsoft OAuth
- [ ] Complete Microsoft OAuth → Should redirect to `/dashboard`
- [ ] Visit `/api/me` → Should return `SessionUser` with Microsoft provider
- [ ] Visit `/login` and click Facebook button → Should redirect to Facebook OAuth
- [ ] Complete Facebook OAuth → Should redirect to `/dashboard`
- [ ] Visit `/api/me` → Should return `SessionUser` with Facebook provider
- [ ] POST `/api/logout` → Should clear session
- [ ] Verify no tokens in cookies (inspect `mapable.sid` cookie)

### Build Testing
- [ ] `pnpm build` should succeed
- [ ] No TypeScript errors
- [ ] No linting errors

## Environment Variables Required

```env
APP_BASE_URL=http://localhost:3000
SESSION_PASSWORD=your-secret-key-min-32-chars
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=common
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

## Security Notes

1. ✅ **No tokens in cookies**: OAuth tokens are not stored in session
2. ✅ **Minimal session payload**: Only user identification data
3. ✅ **HTTP-only cookies**: Session cookie is HTTP-only
4. ✅ **Secure cookies**: HTTPS only in production
5. ✅ **SameSite protection**: CSRF protection via SameSite=Lax

## Known Limitations

1. **Microsoft tenant handling**: The code supports common/organizations/consumers, but specific tenant IDs may need additional verification
2. **Email availability**: Facebook requires app review for email scope in production
3. **Linked providers**: Future enhancement - track multiple providers per email
4. **Callback URL state**: Currently redirects to `/dashboard` - could be enhanced to accept state parameter for dynamic redirects

## Next Steps (Optional Enhancements)

1. Add state parameter support for dynamic callback URLs
2. Implement provider linking (link multiple OAuth providers to same account)
3. Add email verification flow
4. Implement account merge when same email uses different providers
5. Add refresh token handling (if needed for future API calls)
