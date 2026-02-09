# OAuth and Credentials Identity Linkage

## Context

The app supports two authentication methods:

1. **Credentials** (email/password): Users register via `POST /api/register` and sign in with email + password. The user ID is the Prisma `User.id` (cuid).
2. **OAuth** (Auth0, Google, Facebook, Microsoft): Users sign in via a provider. The OAuth `sub` (subject) is used as the user ID in the JWT.

When the same person signs up with Credentials and later signs in with OAuth (or vice versa), they may end up with two different identities in the system. This can cause:

- Duplicate User records
- Inability to associate OAuth sessions with existing participant/provider profiles
- Confusion when users expect "one account"

## Recommended approach: Account linking

### Phase 1: Email-based linking (MVP)

When an OAuth user signs in:

1. Fetch the user's email from the OAuth profile.
2. Check if a User with that email already exists (from Credentials registration).
3. If yes, update the existing User with the OAuth provider's `sub` in an `Account`-like table (NextAuth v4 uses `Account` for provider linkage).
4. Return the existing User ID in the session.

This requires:

- Storing OAuth provider + `sub` in a link table (e.g. NextAuth `Account` model, or a custom `UserOAuthLink`).
- In the JWT/session callback, resolving OAuth `sub` → internal User ID via the link table.

### Phase 2: User-initiated linking

Allow users to "connect" additional sign-in methods from a settings page:

1. User is signed in (Credentials or OAuth).
2. User clicks "Connect Google" (or another provider).
3. OAuth flow runs; on success, create a link between the current User and the OAuth provider + `sub`.
4. Future sign-ins via that provider resolve to the same User.

### Implementation notes

- NextAuth v4 has built-in support for multiple providers per user when using a database adapter (e.g. Prisma adapter) with the `Account` model. The app currently uses JWT sessions without a database adapter for accounts.
- To enable account linking with JWT, you can:
  - Add a Prisma `Account` model and use the Prisma adapter for NextAuth, **or**
  - Implement custom logic in the `jwt` and `session` callbacks: on OAuth sign-in, look up `User` by email (or by a custom `Account` table), and set `token.id` to the internal User ID.
- Ensure email is requested in OAuth scopes (`openid profile email`) and is available in the provider profile.

## References

- [NextAuth Adapters](https://next-auth.js.org/adapters/overview)
- [NextAuth Account model](https://authjs.dev/reference/adapter/prisma#account)
- [AUTH.md](./AUTH.md) – app auth stack
