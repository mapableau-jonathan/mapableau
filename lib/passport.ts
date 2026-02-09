/**
 * Passport.js configuration for API authentication.
 * Use alongside NextAuth: NextAuth handles web session/OAuth; Passport handles
 * API bearer tokens and other strategies in Route Handlers.
 *
 * @see http://www.passportjs.org/
 */

import passport from "passport";
import { Strategy as BearerStrategy } from "passport-http-bearer";

/** User shape returned by Passport for API auth (e.g. bearer token). */
export interface PassportApiUser {
  id: string;
  type: "api";
}

// Validate bearer token from env (API_BEARER_TOKEN). Extend by looking up
// token in DB or calling an auth service.
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;

passport.use(
  new BearerStrategy((token: string, done: (err: Error | null, user?: PassportApiUser | false) => void) => {
    if (!API_BEARER_TOKEN) {
      return done(null, false);
    }
    if (token === API_BEARER_TOKEN) {
      return done(null, { id: "api", type: "api" } as PassportApiUser);
    }
    return done(null, false);
  }),
);

/** Minimal req-like object so Passport Bearer strategy can read Authorization. */
function requestToReq(request: Request): { headers: { authorization?: string } } {
  const auth = request.headers.get("authorization");
  return { headers: { authorization: auth ?? undefined } };
}

/**
 * Authenticate a Next.js Request using Passport Bearer strategy.
 * Use in Route Handlers when you want API token auth instead of NextAuth session.
 *
 * @param request - Next.js Request (e.g. from GET/POST handler)
 * @returns Authenticated user or null
 */
export function authenticateBearer(
  request: Request,
): Promise<PassportApiUser | null> {
  return new Promise((resolve) => {
    const req = requestToReq(request);
    const res = {
      statusCode: 200,
      setHeader: () => {},
      end: () => {},
    };
    const next = () => resolve(null);
    const middleware = passport.authenticate(
      "bearer",
      { session: false },
      (err: Error | null, user?: PassportApiUser) => {
        if (err || !user) resolve(null);
        else resolve(user);
      },
    );
    middleware(
      req as Parameters<ReturnType<typeof passport.authenticate>>[0],
      res as Parameters<ReturnType<typeof passport.authenticate>>[1],
      next,
    );
  });
}

/**
 * Require bearer auth in an API route. Returns 401 if not authenticated.
 *
 * @param request - Next.js Request
 * @returns [user, null] or [null, Response] (401)
 */
export async function requireBearer(
  request: Request,
): Promise<
  [PassportApiUser, null] | [null, Response]
> {
  const user = await authenticateBearer(request);
  if (user) return [user, null];
  return [
    null,
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  ];
}
