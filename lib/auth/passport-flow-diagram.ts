/**
 * Passport.js Flow Diagram
 * Visual representation of authentication flows
 */

/**
 * OAuth 2.0 Flow Diagram
 * 
 * ┌─────────────┐
 * │   Client    │
 * │  Service    │
 * └──────┬──────┘
 *        │
 *        │ 1. GET /api/auth/identity-provider/[provider]?serviceId=...
 *        │
 * ┌──────▼──────────────────────────────────────┐
 * │         ad.id Identity Provider            │
 * │  ┌──────────────────────────────────────┐  │
 * │  │   initiateAuth()                     │  │
 * │  │  - Validate serviceId                │  │
 * │  │  - Generate state token              │  │
 * │  │  - Build OAuth URL                   │  │
 * │  └──────────────────────────────────────┘  │
 * └──────┬──────────────────────────────────────┘
 *        │
 *        │ 2. Redirect to Provider
 *        │
 * ┌──────▼──────────────┐
 * │  OAuth Provider     │
 * │  (Google/Facebook/  │
 * │   Microsoft/Wix)    │
 * └──────┬──────────────┘
 *        │
 *        │ 3. User Authorizes
 *        │
 *        │ 4. GET /callback?code=...&state=...
 *        │
 * ┌──────▼──────────────────────────────────────┐
 * │         ad.id Identity Provider            │
 * │  ┌──────────────────────────────────────┐  │
 * │  │   handleCallback()                    │  │
 * │  │  - Validate state                     │  │
 * │  │  - Exchange code for tokens           │  │
 * │  │  - Get user profile                   │  │
 * │  │  - Normalize profile                  │  │
 * │  │  - Link/create account                │  │
 * │  │  - Create service link                │  │
 * │  │  - Issue JWT tokens                   │  │
 * │  └──────────────────────────────────────┘  │
 * └──────┬──────────────────────────────────────┘
 *        │
 *        │ 5. Redirect with Token
 *        │ GET /callback?token=...&serviceId=...
 *        │
 * ┌──────▼──────┐
 * │   Client    │
 * │  Service    │
 * └─────────────┘
 */

/**
 * Passport Strategy Flow
 * 
 * ┌─────────────────────────────────────────┐
 * │         Passport Strategy                │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  1. Strategy Configuration          │ │
 * │  │     - Client ID/Secret              │ │
 * │  │     - Callback URL                 │ │
 * │  │     - Scopes                       │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  2. OAuth Initiation                │ │
 * │  │     - Build authorization URL       │ │
 * │  │     - Include state parameter       │ │
 * │  │     - Redirect to provider         │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  3. OAuth Callback                  │ │
 * │  │     - Receive code & state          │ │
 * │  │     - Exchange code for tokens      │ │
 * │  │     - Fetch user profile            │ │
 * │  │     - Call verify callback          │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  4. Verify Callback                  │ │
 * │  │     - Normalize profile              │ │
 * │  │     - Create/update user             │ │
 * │  │     - Link account                   │ │
 * │  │     - Return user object             │ │
 * │  └─────────────────────────────────────┘ │
 * └─────────────────────────────────────────┘
 */

/**
 * Token Issuance Flow
 * 
 * ┌─────────────────────────────────────────┐
 * │      Token Issuance Service             │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  1. Validate Request                │ │
 * │  │     - Service exists?                │ │
 * │  │     - Service enabled?               │ │
 * │  │     - User exists?                   │ │
 * │  │     - Scopes valid?                  │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  2. Generate Tokens                 │ │
 * │  │     - Access token (15min)           │ │
 * │  │     - Refresh token (7days)          │ │
 * │  │     - Include claims:                │ │
 * │  │       * sub (user ID)                │ │
 * │  │       * email                        │ │
 * │  │       * serviceAccess                │ │
 * │  │       * scopes                       │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  3. Store Metadata                  │ │
 * │  │     - Token ID                      │ │
 * │  │     - User ID                       │ │
 * │  │     - Service ID                    │ │
 * │  │     - Expiration                    │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  4. Return Tokens                   │ │
 * │  │     - Set cookies                    │ │
 * │  │     - Return in response             │ │
 * │  └─────────────────────────────────────┘ │
 * └─────────────────────────────────────────┘
 */

/**
 * Account Linking Flow
 * 
 * ┌─────────────────────────────────────────┐
 * │         Account Linker                  │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  1. Check Existing Account          │ │
 * │  │     - Provider + ProviderAccountId  │ │
 * │  │     - If exists: Update tokens      │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  2. Find User by Email              │ │
 * │  │     - If found: Link account        │ │
 * │  │     - If not: Create new user      │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  3. Security Checks                 │ │
 * │  │     - Email verification?            │ │
 * │  │     - Prevent account takeover      │ │
 * │  └─────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────┐ │
 * │  │  4. Create/Update Records           │ │
 * │  │     - User record                   │ │
 * │  │     - Account record                │ │
 * │  │     - ServiceLink record            │ │
 * │  └─────────────────────────────────────┘ │
 * └─────────────────────────────────────────┘
 */

export const PassportFlowDiagrams = {
  oauth: "OAuth 2.0 Flow Diagram",
  strategy: "Passport Strategy Flow",
  token: "Token Issuance Flow",
  accountLinking: "Account Linking Flow",
};
