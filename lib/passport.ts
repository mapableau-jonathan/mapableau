/**
 * Passport Configuration
 * Singleton initialization guard for serverless environments
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { SessionUser, Provider } from "./session";

let passportInitialized = false;

/**
 * Normalize provider profile to SessionUser
 */
function normalizeToSessionUser(
  provider: Provider,
  profile: any,
  providerId: string
): SessionUser {
  // Extract email - different providers have different field names
  const email =
    profile.emails?.[0]?.value ||
    profile.email ||
    profile.mail ||
    profile.userPrincipalName ||
    profile.contact?.email ||
    undefined;

  // Extract name - prefer displayName, fallback to name components
  const name =
    profile.displayName ||
    profile.name?.displayName ||
    (profile.name?.givenName && profile.name?.familyName
      ? `${profile.name.givenName} ${profile.name.familyName}`
      : undefined) ||
    profile.name ||
    undefined;

  return {
    id: providerId,
    provider,
    email,
    name,
    roles: ["participant"],
    verificationStatus: "unverified" as const,
    linkedProviders: [],
  };
}

/**
 * Initialize Passport strategies
 * Singleton pattern to prevent multiple initializations in serverless
 */
export function initPassport(): void {
  if (passportInitialized) {
    return;
  }

  const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      "google",
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${APP_BASE_URL}/api/auth/google/callback`,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Don't store tokens - just normalize user
            const user = normalizeToSessionUser("google", profile, profile.id);
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  // Microsoft Strategy (using OAuth2Strategy)
  if (
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    process.env.MICROSOFT_TENANT_ID
  ) {
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

    passport.use(
      "microsoft",
      new OAuth2Strategy(
        {
          authorizationURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
          tokenURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          clientID: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          callbackURL: `${APP_BASE_URL}/api/auth/microsoft/callback`,
          scope: "openid profile email",
        },
        async (accessToken, refreshToken, params: any, profile, done) => {
          try {
            // Microsoft uses ID token in params, fetch user info from Graph API
            let userInfo: any = null;
            if (params.id_token) {
              // Decode ID token (contains user info)
              try {
                const payload = JSON.parse(
                  Buffer.from(params.id_token.split(".")[1], "base64").toString()
                );
                userInfo = {
                  id: payload.sub || payload.oid,
                  displayName: payload.name,
                  email: payload.email,
                  mail: payload.email || payload.preferred_username,
                  userPrincipalName: payload.preferred_username || payload.email,
                };
              } catch {
                // Fallback: fetch from Graph API
                const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (graphResponse.ok) {
                  userInfo = await graphResponse.json();
                  userInfo.id = userInfo.id || userInfo.userPrincipalName;
                }
              }
            }

            if (!userInfo || !userInfo.id) {
              return done(new Error("Failed to fetch Microsoft user info"), null);
            }

            // Don't store tokens - just normalize user
            const user = normalizeToSessionUser(
              "microsoft",
              userInfo,
              userInfo.id
            );
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  // Facebook Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      "facebook",
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${APP_BASE_URL}/api/auth/facebook/callback`,
          scope: ["email"],
          profileFields: ["id", "displayName", "email", "name"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Don't store tokens - just normalize user
            const user = normalizeToSessionUser("facebook", profile, profile.id);
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  // Minimal serialize/deserialize (may not be used but good practice)
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  passportInitialized = true;
}
