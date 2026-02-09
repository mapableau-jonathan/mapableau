# Authentication: Passport + NextAuth

This app uses **Passport** and **NextAuth** for authentication.

## Stack

<!-- markdownlint-disable MD060 -->
| Layer        | Use case                                                         | Where                                                                       |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **NextAuth** | Web session, OAuth (Auth0), credentials (email/password)         | `app/api/auth/[...nextauth]`, `getServerSession`, `useSession`, `signIn`    |
| **Passport** | API bearer token auth (machine-to-machine, API keys)             | `lib/passport.ts`, Route Handlers that call `authenticateBearer` / `requireBearer` |
<!-- markdownlint-enable MD060 -->

- **NextAuth**: Handles browser sign-in, JWT session, Auth0 redirect, and credentials provider. Use `auth()` (from `@/lib/auth`) or `getServerSession(authOptions)` in server components and API routes that need the current web user. Handles browser sign-in, JWT session, Auth0 redirect, and credentials provider. Use `auth()` (from `@/lib/auth`) or `getServerSession(authOptions)` in server components and API routes that need the current web user.
- **Passport**: Handles API requests that send `Authorization: Bearer <token>`. Configured in `lib/passport.ts` with the Bearer strategy. Use `requireBearer(request)` in Route Handlers when you want token-based API auth instead of (or in addition to) session.

## Quick reference

- **Web login**: NextAuth — see [AUTH0.md](./AUTH0.md) and `/login`.
- **API token auth**: Passport — set `API_BEARER_TOKEN` in env, then send `Authorization: Bearer <API_BEARER_TOKEN>` on API requests. Example route: `GET /api/auth/bearer-example`.

## Adding more Passport strategies

1. Install the strategy (e.g. `passport-custom`, `passport-api-key`).
2. In `lib/passport.ts`, call `passport.use(new SomeStrategy(...))`.
3. In Route Handlers, call `passport.authenticate('strategy-name', { session: false }, callback)` with a minimal req/res adapter, or export a helper like `authenticateBearer` that does the same for your strategy.

See [Passport docs](http://www.passportjs.org/docs/) and [Strategies](http://www.passportjs.org/packages/).
