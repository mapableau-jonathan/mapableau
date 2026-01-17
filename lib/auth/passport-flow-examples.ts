/**
 * Passport.js Flow Examples
 * Code examples for different authentication scenarios
 */

/**
 * Example 1: Google OAuth Flow
 */
export async function exampleGoogleOAuthFlow() {
  // Step 1: Client redirects user
  const authUrl = `/api/auth/identity-provider/google?serviceId=mapable&callback=https://mapable.com.au/auth/callback`;
  // window.location.href = authUrl;

  // Step 2: ad.id initiates OAuth
  // - Validates serviceId
  // - Generates state token
  // - Redirects to Google

  // Step 3: User authorizes on Google
  // - Google shows consent screen
  // - User clicks "Allow"

  // Step 4: Google redirects back
  // GET /api/auth/identity-provider/google/callback?code=...&state=...

  // Step 5: ad.id processes callback
  // - Validates state
  // - Exchanges code for tokens
  // - Gets user profile
  // - Links account
  // - Issues JWT tokens
  // - Redirects to client with token
}

/**
 * Example 2: Local Authentication Flow
 */
export async function exampleLocalAuthFlow() {
  // Step 1: Client sends credentials
  const response = await fetch("/api/auth/passport/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user@example.com",
      password: "password123",
    }),
  });

  // Step 2: Passport Local Strategy
  // - Finds user by email
  // - Verifies password hash
  // - Returns user object

  // Step 3: Generate JWT tokens
  // - Access token
  // - Refresh token

  // Step 4: Return tokens to client
  const { tokens, user } = await response.json();
}

/**
 * Example 3: Token Validation Flow
 */
export async function exampleTokenValidationFlow() {
  // Step 1: Client sends request with token
  const response = await fetch("/api/tokens/validate?serviceId=mapable", {
    headers: {
      Authorization: "Bearer [access_token]",
    },
  });

  // Step 2: Passport JWT Strategy
  // - Extracts token from header
  // - Verifies JWT signature
  // - Checks expiration
  // - Validates service access
  // - Returns user payload

  const { valid, payload } = await response.json();
}

/**
 * Example 4: Token Refresh Flow
 */
export async function exampleTokenRefreshFlow() {
  // Step 1: Client sends refresh token
  const response = await fetch("/api/auth/passport/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refreshToken: "[refresh_token]",
    }),
  });

  // Step 2: Verify refresh token
  // - Check signature
  // - Check expiration
  // - Get user ID

  // Step 3: Issue new tokens
  // - Generate new access token
  // - Generate new refresh token (optional)

  // Step 4: Return new tokens
  const { tokens } = await response.json();
}

/**
 * Example 5: Multi-Provider Account Linking
 */
export async function exampleAccountLinkingFlow() {
  // User already has Google account
  // User wants to link Facebook account

  // Step 1: User authenticates with Facebook
  const facebookAuthUrl = `/api/auth/identity-provider/facebook?serviceId=mapable`;

  // Step 2: Facebook OAuth completes
  // - ad.id gets Facebook profile
  // - Finds existing user by email (same as Google account)
  // - Links Facebook account to existing user
  // - Returns success

  // Step 3: User now has both providers linked
  // - Can sign in with either Google or Facebook
  // - Both accounts point to same user record
}

/**
 * Example 6: Service-Specific Authentication
 */
export async function exampleServiceSpecificAuthFlow() {
  // User wants to access MapAble service

  // Step 1: MapAble redirects to ad.id
  const mapableAuthUrl = `/api/auth/identity-provider/google?serviceId=mapable`;

  // Step 2: User authenticates
  // - OAuth flow completes
  // - Account linked/created

  // Step 3: Service link created
  // - ServiceLink record: userId + serviceType=MAPABLE
  // - Marks user as having access to MapAble

  // Step 4: Token issued with service access
  // - JWT includes: serviceAccess: ["mapable"]
  // - Token can only be used for MapAble

  // Step 5: MapAble receives token
  // - Validates token
  // - Checks serviceAccess includes "mapable"
  // - Creates local session
}

/**
 * Example 7: Cross-Service Access
 */
export async function exampleCrossServiceAccessFlow() {
  // User authenticated in MapAble
  // User wants to access AccessiBooks

  // Step 1: AccessiBooks checks token
  // - Token has serviceAccess: ["mapable"]
  // - AccessiBooks not in serviceAccess

  // Step 2: AccessiBooks redirects to ad.id
  const accessibooksAuthUrl = `/api/auth/identity-provider/google?serviceId=accessibooks`;

  // Step 3: ad.id recognizes existing user
  // - User already authenticated (via session/cookie)
  // - Creates ServiceLink for AccessiBooks
  // - Issues new token with both services

  // Step 4: New token includes both services
  // - serviceAccess: ["mapable", "accessibooks"]
  // - User can now access both services
}

/**
 * Example 8: Wix User Data Sync Flow
 */
export async function exampleWixSyncFlow() {
  // Step 1: User authenticates with Wix
  const wixAuthUrl = `/api/auth/identity-provider/wix?serviceId=mapable`;

  // Step 2: Wix OAuth completes
  // - Wix access token stored (encrypted)
  // - User account created/linked

  // Step 3: Wix user sync service
  // - Retrieves user data from Wix API
  // - Syncs profile information
  // - Updates user record

  // Step 4: MediaWiki requests user info
  const userInfo = await fetch("/api/user-info/[userId]?format=mediawiki", {
    headers: { Authorization: "Bearer [token]" },
  });

  // Step 5: User info includes Wix data
  // - Returns synced user information
  // - MediaWiki can use for account creation
}

/**
 * Example 9: MediaWiki OAuth Flow
 */
export async function exampleMediaWikiOAuthFlow() {
  // Step 1: MediaWiki redirects to ad.id
  const mediawikiAuthUrl = `/api/auth/mediawiki?serviceId=mediawiki`;

  // Step 2: ad.id redirects to MediaWiki OAuth
  // - MediaWiki OAuth 1.0a flow
  // - User authorizes

  // Step 3: MediaWiki redirects back
  // GET /api/auth/mediawiki/callback?oauth_token=...&oauth_verifier=...

  // Step 4: ad.id processes callback
  // - Exchanges OAuth token for access token
  // - Gets MediaWiki user info
  // - Links account

  // Step 5: Sync user to MediaWiki
  // - Creates MediaWiki account if needed
  // - Updates MediaWiki user info
  // - Stores MediaWiki account link

  // Step 6: Issue token and redirect
  // - JWT token issued
  // - Redirect to MediaWiki
}

/**
 * Example 10: Replit OAuth Flow
 */
export async function exampleReplitOAuthFlow() {
  // Step 1: Replit app redirects to ad.id
  const replitAuthUrl = `/api/auth/replit?serviceId=cursor-replit`;

  // Step 2: ad.id redirects to Replit OAuth
  // - Replit OAuth 2.0 flow
  // - User authorizes

  // Step 3: Replit redirects back
  // GET /api/auth/replit/callback?code=...&state=...

  // Step 4: ad.id processes callback
  // - Exchanges code for tokens
  // - Gets Replit user info
  // - Creates/links account
  // - Creates service link for cursor-replit

  // Step 5: Issue token and redirect
  // - JWT token issued
  // - Redirect to Replit app
}
