/**
 * Centralized Passport.js Configuration
 * JWT and SSO authentication strategies for Australian Disability Ltd services
 */

import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { Strategy as SamlStrategy } from "passport-saml";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { verify } from "argon2";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/config/env";

const env = getEnv();

/**
 * JWT Strategy Configuration
 * Validates JWT tokens for API requests
 */
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || env.NEXTAUTH_SECRET,
  issuer: process.env.JWT_ISSUER || "australian-disability-ltd",
  audience: process.env.JWT_AUDIENCE || "australian-disability-services",
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // Find user by ID from token payload
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          image: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return done(null, false, { message: "User not found" });
      }

      // Check if token is expired (additional check)
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return done(null, false, { message: "Token expired" });
      }

      return done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
        emailVerified: user.emailVerified,
        serviceAccess: payload.serviceAccess || [],
      });
    } catch (error) {
      logger.error("JWT Strategy error", error);
      return done(error, false);
    }
  })
);

/**
 * Local Strategy (Email/Password)
 * For traditional credential-based authentication
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        if (!user.passwordHash) {
          return done(null, false, {
            message: "Account uses OAuth. Please sign in with your provider.",
          });
        }

        const valid = await verify(user.passwordHash, password);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        });
      } catch (error) {
        logger.error("Local Strategy error", error);
        return done(error, false);
      }
    }
  )
);

/**
 * OAuth2 Strategy for SSO
 * Supports multiple OAuth2 providers (Google, Azure AD, etc.)
 */
if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
  passport.use(
    "oauth2-sso",
    new OAuth2Strategy(
      {
        authorizationURL: process.env.OAUTH2_AUTHORIZATION_URL || "",
        tokenURL: process.env.OAUTH2_TOKEN_URL || "",
        clientID: process.env.OAUTH2_CLIENT_ID,
        clientSecret: process.env.OAUTH2_CLIENT_SECRET,
        callbackURL: process.env.OAUTH2_CALLBACK_URL || "/api/auth/sso/oauth2/callback",
        scope: process.env.OAUTH2_SCOPE?.split(",") || ["openid", "profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find or create user based on OAuth profile
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in OAuth profile"), null);
          }

          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { accounts: true },
          });

          if (user) {
            // Update or create account link
            const account = user.accounts.find(
              (acc) => acc.provider === "oauth2" && acc.providerAccountId === profile.id
            );

            if (!account) {
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: "oauth",
                  provider: "oauth2",
                  providerAccountId: profile.id,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            } else {
              await prisma.account.update({
                where: { id: account.id },
                data: {
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            }
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name: profile.displayName || profile.name?.givenName || "User",
                image: profile.photos?.[0]?.value,
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: "oauth",
                    provider: "oauth2",
                    providerAccountId: profile.id,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  },
                },
              },
              include: { accounts: true },
            });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          });
        } catch (error) {
          logger.error("OAuth2 Strategy error", error);
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Google OAuth 2.0 Strategy
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.AD_ID_DOMAIN
          ? `${process.env.AD_ID_DOMAIN}/api/auth/identity-provider/google/callback`
          : "/api/auth/identity-provider/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in Google profile"), null);
          }

          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { accounts: true },
          });

          if (user) {
            const account = user.accounts.find(
              (acc) => acc.provider === "google" && acc.providerAccountId === profile.id
            );

            if (!account) {
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: "oauth",
                  provider: "google",
                  providerAccountId: profile.id,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            } else {
              await prisma.account.update({
                where: { id: account.id },
                data: {
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name: profile.displayName || profile.name?.givenName || "User",
                image: profile.photos?.[0]?.value,
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: "oauth",
                    provider: "google",
                    providerAccountId: profile.id,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  },
                },
              },
              include: { accounts: true },
            });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          });
        } catch (error) {
          logger.error("Google Strategy error", error);
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Facebook OAuth Strategy
 */
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(
    "facebook",
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.AD_ID_DOMAIN
          ? `${process.env.AD_ID_DOMAIN}/api/auth/identity-provider/facebook/callback`
          : "/api/auth/identity-provider/facebook/callback",
        scope: ["email", "public_profile"],
        profileFields: ["id", "email", "name", "picture"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in Facebook profile"), null);
          }

          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { accounts: true },
          });

          if (user) {
            const account = user.accounts.find(
              (acc) => acc.provider === "facebook" && acc.providerAccountId === profile.id
            );

            if (!account) {
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: "oauth",
                  provider: "facebook",
                  providerAccountId: profile.id,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            } else {
              await prisma.account.update({
                where: { id: account.id },
                data: {
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name: profile.displayName || profile.name?.givenName || "User",
                image: profile.photos?.[0]?.value,
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: "oauth",
                    provider: "facebook",
                    providerAccountId: profile.id,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  },
                },
              },
              include: { accounts: true },
            });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          });
        } catch (error) {
          logger.error("Facebook Strategy error", error);
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Microsoft Entra ID Strategy (using OAuth2Strategy with custom configuration)
 */
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  passport.use(
    "azure-ad",
    new OAuth2Strategy(
      {
        authorizationURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        clientID: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        callbackURL: process.env.AD_ID_DOMAIN
          ? `${process.env.AD_ID_DOMAIN}/api/auth/identity-provider/microsoft/callback`
          : "/api/auth/identity-provider/microsoft/callback",
        scope: "openid profile email",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Fetch user info from Microsoft Graph
          const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!userInfoResponse.ok) {
            return done(new Error("Failed to fetch user info from Microsoft"), null);
          }

          const userInfo = await userInfoResponse.json();
          const email = userInfo.mail || userInfo.userPrincipalName;

          if (!email) {
            return done(new Error("No email found in Microsoft profile"), null);
          }

          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { accounts: true },
          });

          if (user) {
            const account = user.accounts.find(
              (acc) => acc.provider === "microsoft" && acc.providerAccountId === userInfo.id
            );

            if (!account) {
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: "oauth",
                  provider: "microsoft",
                  providerAccountId: userInfo.id,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            } else {
              await prisma.account.update({
                where: { id: account.id },
                data: {
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name: userInfo.displayName || userInfo.givenName || "User",
                image: null,
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: "oauth",
                    provider: "microsoft",
                    providerAccountId: userInfo.id,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  },
                },
              },
              include: { accounts: true },
            });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          });
        } catch (error) {
          logger.error("Microsoft Entra Strategy error", error);
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Wix OAuth 2.0 Strategy
 * Supports Wix OAuth for user authentication and data retrieval
 */
if (process.env.WIX_CLIENT_ID && process.env.WIX_CLIENT_SECRET && process.env.WIX_APP_ID) {
  passport.use(
    "wix",
    new OAuth2Strategy(
      {
        authorizationURL: "https://www.wix.com/oauth/authorize",
        tokenURL: "https://www.wix.com/oauth/access",
        clientID: process.env.WIX_CLIENT_ID,
        clientSecret: process.env.WIX_CLIENT_SECRET,
        callbackURL: process.env.AD_ID_DOMAIN
          ? `${process.env.AD_ID_DOMAIN}/api/auth/identity-provider/wix/callback`
          : "/api/auth/identity-provider/wix/callback",
        scope: "openid profile email",
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          // Wix OAuth profile may be in params or need to be fetched
          // Fetch user info from Wix API
          const wixUserResponse = await fetch("https://www.wixapis.com/members/v1/members/current", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          let wixUser: any = null;
          if (wixUserResponse.ok) {
            const wixData = await wixUserResponse.json();
            wixUser = wixData.member || wixData;
          }

          const email = wixUser?.contact?.email || wixUser?.email || profile?.email || params?.email;
          if (!email) {
            return done(new Error("No email found in Wix profile"), null);
          }

          const wixMemberId = wixUser?.id || profile?.id || params?.user_id;

          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { accounts: true },
          });

          if (user) {
            const account = user.accounts.find(
              (acc) => acc.provider === "wix" && acc.providerAccountId === wixMemberId
            );

            if (!account) {
              // Encrypt tokens before storing
              const { encryptToken } = await import("@/lib/services/auth/wix-user-sync");
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: "oauth",
                  provider: "wix",
                  providerAccountId: wixMemberId,
                  access_token: encryptToken(accessToken),
                  refresh_token: refreshToken ? encryptToken(refreshToken) : null,
                },
              });
            } else {
              // Update tokens
              const { encryptToken } = await import("@/lib/services/auth/wix-user-sync");
              await prisma.account.update({
                where: { id: account.id },
                data: {
                  access_token: encryptToken(accessToken),
                  refresh_token: refreshToken ? encryptToken(refreshToken) : null,
                },
              });
            }
          } else {
            // Create new user
            const { encryptToken } = await import("@/lib/services/auth/wix-user-sync");
            const name = wixUser?.contact?.firstName && wixUser?.contact?.lastName
              ? `${wixUser.contact.firstName} ${wixUser.contact.lastName}`
              : wixUser?.contact?.fullName || wixUser?.name || profile?.name || "User";
            const image = wixUser?.image?.url || wixUser?.photo || profile?.imageUrl;

            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name,
                image,
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: "oauth",
                    provider: "wix",
                    providerAccountId: wixMemberId,
                    access_token: encryptToken(accessToken),
                    refresh_token: refreshToken ? encryptToken(refreshToken) : null,
                  },
                },
              },
              include: { accounts: true },
            });
          }

          // Sync Wix user data
          const { syncWixUserData } = await import("@/lib/services/auth/wix-user-sync");
          await syncWixUserData(user.id);

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          });
        } catch (error) {
          logger.error("Wix Strategy error", error);
          return done(error, null);
        }
      }
    )
  );
}

/**
 * SAML Strategy for Enterprise SSO
 * Supports SAML 2.0 for enterprise authentication
 */
if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER) {
  passport.use(
    "saml",
    new SamlStrategy(
      {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER,
        callbackUrl: process.env.SAML_CALLBACK_URL || "/api/auth/sso/saml/callback",
        cert: process.env.SAML_CERT,
        identifierFormat: process.env.SAML_IDENTIFIER_FORMAT || "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || "sha256",
        wantAssertionsSigned: process.env.SAML_WANT_ASSERTIONS_SIGNED === "true",
        wantMessageSigned: process.env.SAML_WANT_MESSAGE_SIGNED === "true",
      },
      async (profile, done) => {
        try {
          const email = profile.email || profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
          const name = profile.name || profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];

          if (!email) {
            return done(new Error("No email found in SAML profile"), null);
          }

          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { accounts: true },
          });

          if (user) {
            // Update or create account link
            const account = user.accounts.find(
              (acc) => acc.provider === "saml" && acc.providerAccountId === profile.nameID
            );

            if (!account) {
              await prisma.account.create({
                data: {
                  userId: user.id,
                  type: "saml",
                  provider: "saml",
                  providerAccountId: profile.nameID,
                },
              });
            }
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name: name || "User",
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: "saml",
                    provider: "saml",
                    providerAccountId: profile.nameID,
                  },
                },
              },
              include: { accounts: true },
            });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          });
        } catch (error) {
          logger.error("SAML Strategy error", error);
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
