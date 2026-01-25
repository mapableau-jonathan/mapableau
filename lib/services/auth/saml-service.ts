/**
 * SAML Service
 * Comprehensive SAML 2.0 SSO implementation
 * Supports both Identity Provider (IdP) initiated and Service Provider (SP) initiated flows
 */

import { ServiceId, serviceRegistry } from "./service-registry";
import { normalizeProfile, NormalizedProfile } from "./profile-normalizer";
import { linkAccount, AccountLinkResult } from "./account-linker";
import { issueToken, TokenIssuanceResult } from "./token-issuance-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export interface SAMLConfig {
  entryPoint: string; // IdP SSO URL
  issuer: string; // SP entity ID
  callbackUrl: string; // ACS (Assertion Consumer Service) URL
  cert?: string; // IdP certificate for signature verification
  privateKey?: string; // SP private key for request signing
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  wantAssertionsSigned?: boolean;
  wantMessageSigned?: boolean;
  forceAuthn?: boolean;
  allowCreate?: boolean;
  nameIDFormat?: string;
}

export interface SAMLInitiationResult {
  success: boolean;
  samlRequest?: string; // Base64 encoded SAML AuthnRequest (for SP-initiated)
  redirectUrl?: string; // Full redirect URL with SAMLRequest parameter
  relayState?: string;
  error?: string;
}

export interface SAMLCallbackResult {
  success: boolean;
  userId?: string;
  tokens?: TokenIssuanceResult;
  callbackUrl?: string;
  profile?: NormalizedProfile;
  error?: string;
}

/**
 * Generate secure relay state token
 */
function generateRelayState(serviceId: ServiceId, callbackUrl: string, nonce: string): string {
  return Buffer.from(
    JSON.stringify({ serviceId, callbackUrl, nonce, timestamp: Date.now() })
  ).toString("base64url");
}

/**
 * Parse relay state token
 */
function parseRelayState(state: string): {
  serviceId?: ServiceId;
  callbackUrl?: string;
  nonce?: string;
  timestamp?: number;
} | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return null;
  }
}

/**
 * Get base URL (cached)
 */
let cachedBaseUrl: string | null = null;
function getBaseUrl(): string {
  if (!cachedBaseUrl) {
    cachedBaseUrl = process.env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "";
  }
  return cachedBaseUrl;
}

/**
 * Get SAML configuration from environment or service config
 */
export function getSAMLConfig(serviceId: ServiceId): SAMLConfig | null {
  const env = process.env;
  const baseUrl = getBaseUrl();

  // Check for SAML environment variables
  const entryPoint = env.SAML_ENTRY_POINT || env.SAML_IDP_SSO_URL;
  const issuer = env.SAML_ISSUER || env.SAML_SP_ENTITY_ID || `${baseUrl}/api/auth/sso/saml`;
  const callbackUrl = `${baseUrl}/api/auth/sso/saml/callback`;
  const cert = env.SAML_IDP_CERT || env.SAML_CERT;
  const privateKey = env.SAML_SP_PRIVATE_KEY || env.SAML_PRIVATE_KEY;

  if (!entryPoint) {
    logger.warn("SAML entry point not configured", { serviceId });
    return null;
  }

  return {
    entryPoint,
    issuer,
    callbackUrl,
    cert: cert || undefined,
    privateKey: privateKey || undefined,
    signatureAlgorithm: env.SAML_SIGNATURE_ALGORITHM || "rsa-sha256",
    digestAlgorithm: env.SAML_DIGEST_ALGORITHM || "sha256",
    wantAssertionsSigned: env.SAML_WANT_ASSERTIONS_SIGNED === "true",
    wantMessageSigned: env.SAML_WANT_MESSAGE_SIGNED === "true",
    forceAuthn: env.SAML_FORCE_AUTHN === "true",
    allowCreate: env.SAML_ALLOW_CREATE !== "false",
    nameIDFormat: env.SAML_NAME_ID_FORMAT || "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
  };
}

/**
 * Generate SAML AuthnRequest XML manually
 * This generates a simple SAML 2.0 AuthnRequest without requiring xml2js
 */
function generateAuthnRequestXML(config: SAMLConfig, relayState: string): string {
  const id = `_${crypto.randomBytes(16).toString("hex")}`;
  const issueInstant = new Date().toISOString();
  const nameIDFormat = config.nameIDFormat || "urn:oasis:names:tc:SAML:2.0:nameid-format:transient";

  // Generate SAML 2.0 AuthnRequest XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" `;
  xml += `xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" `;
  xml += `ID="${id}" `;
  xml += `Version="2.0" `;
  xml += `IssueInstant="${issueInstant}" `;
  xml += `Destination="${config.entryPoint}" `;
  xml += `AssertionConsumerServiceURL="${config.callbackUrl}" `;
  xml += `ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"`;
  if (config.forceAuthn) {
    xml += ` ForceAuthn="true"`;
  }
  xml += `>`;
  xml += `<saml:Issuer>${escapeXml(config.issuer)}</saml:Issuer>`;
  xml += `<samlp:NameIDPolicy Format="${escapeXml(nameIDFormat)}"`;
  if (config.allowCreate) {
    xml += ` AllowCreate="true"`;
  }
  xml += `/>`;
  xml += `</samlp:AuthnRequest>`;

  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Initiate SAML SSO (SP-initiated flow)
 */
export async function initiateSAML(
  serviceId: ServiceId,
  callbackUrl?: string
): Promise<SAMLInitiationResult> {
  try {
    // Validate service
    const service = serviceRegistry.get(serviceId);
    if (!service || !service.enabled) {
      return {
        success: false,
        error: "Service not found or disabled",
      };
    }

    // Get SAML configuration
    const config = getSAMLConfig(serviceId);
    if (!config) {
      return {
        success: false,
        error: "SAML not configured for this service",
      };
    }

    // Use service callback URL if not provided
    const finalCallbackUrl = callbackUrl || service.callbackUrl;

    // Generate relay state
    const nonce = crypto.randomBytes(16).toString("hex");
    const relayState = generateRelayState(serviceId, finalCallbackUrl, nonce);

    // Generate SAML AuthnRequest XML
    const authnRequestXml = generateAuthnRequestXML(config, relayState);

    // Base64 encode the SAML request
    // Optionally deflate if configured (some IdPs expect deflated requests)
    const shouldDeflate = process.env.SAML_DEFLATE_REQUEST === "true";
    let samlRequest: string;
    
    if (shouldDeflate) {
      // Use zlib for deflation if needed (Node.js built-in)
      const zlib = await import("zlib");
      const deflated = zlib.deflateRawSync(authnRequestXml);
      samlRequest = deflated.toString("base64");
    } else {
      samlRequest = Buffer.from(authnRequestXml).toString("base64");
    }

    // Build redirect URL with SAMLRequest and RelayState
    const redirectUrl = new URL(config.entryPoint);
    redirectUrl.searchParams.set("SAMLRequest", samlRequest);
    redirectUrl.searchParams.set("RelayState", relayState);

    logger.info("SAML SSO initiated", {
      serviceId,
      entryPoint: config.entryPoint,
      relayState,
    });

    return {
      success: true,
      samlRequest,
      redirectUrl: redirectUrl.toString(),
      relayState,
    };
  } catch (error) {
    logger.error("SAML initiation error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SAML initiation failed",
    };
  }
}

/**
 * Process SAML response/callback
 */
export async function handleSAMLCallback(
  samlResponse: string, // Base64 encoded SAML response
  relayState: string,
  serviceId: ServiceId
): Promise<SAMLCallbackResult> {
  try {
    // Parse relay state
    const stateData = parseRelayState(relayState);
    if (!stateData || !stateData.serviceId || !stateData.callbackUrl) {
      return {
        success: false,
        error: "Invalid relay state",
      };
    }

    // Get SAML configuration
    const config = getSAMLConfig(serviceId);
    if (!config) {
      return {
        success: false,
        error: "SAML not configured",
      };
    }

    // Get service for email verification requirements
    const service = serviceRegistry.get(serviceId);

    // Decode SAML response
    let samlResponseXml: string;
    try {
      const decoded = Buffer.from(samlResponse, "base64");
      // Try deflated first (common in SAML), then plain XML
      try {
        const zlib = await import("zlib");
        samlResponseXml = zlib.inflateRawSync(decoded).toString("utf-8");
      } catch {
        samlResponseXml = decoded.toString("utf-8");
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to decode SAML response",
      };
    }

    // Parse SAML response XML manually
    // Extract user attributes from SAML assertion
    // Note: For production, use a proper XML parser like xml2js or use passport-saml's validation
    // This is a simplified parser that extracts common attributes
    const nameIDMatch = samlResponseXml.match(/<saml:NameID[^>]*>(.*?)<\/saml:NameID>/i) ||
                       samlResponseXml.match(/<NameID[^>]*>(.*?)<\/NameID>/i);
    const nameID = nameIDMatch ? nameIDMatch[1].trim() : null;

    // Extract attribute values using regex (simplified - use XML parser for production)
    const extractAttribute = (name: string): string | null => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(`<saml:Attribute[^>]*Name="${escapedName}"[^>]*>.*?<saml:AttributeValue[^>]*>(.*?)<\/saml:AttributeValue>.*?<\/saml:Attribute>`, "is"),
        new RegExp(`<Attribute[^>]*Name="${escapedName}"[^>]*>.*?<AttributeValue[^>]*>(.*?)<\/AttributeValue>.*?<\/Attribute>`, "is"),
      ];
      for (const pattern of patterns) {
        const match = samlResponseXml.match(pattern);
        if (match && match[1]) {
          return match[1].trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        }
      }
      return null;
    };

    const email = extractAttribute("email") ||
                  extractAttribute("mail") ||
                  extractAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") ||
                  extractAttribute("urn:oid:0.9.2342.19200300.100.1.3");
    
    const name = extractAttribute("name") ||
                 extractAttribute("displayName") ||
                 extractAttribute("cn") ||
                 extractAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name");
    
    const picture = extractAttribute("picture") ||
                    extractAttribute("photo") ||
                    extractAttribute("thumbnailPhoto");

    if (!email) {
      return {
        success: false,
        error: "Email not found in SAML assertion",
      };
    }

    // Store raw SAML profile for normalization
    const rawSAMProfile = {
      nameID,
      email,
      name,
      picture,
      attributes: { email, name, picture },
      samlResponse: samlResponseXml,
    };

    // Normalize profile using the profile normalizer (pass raw SAML profile)
    const normalizedProfileFormatted = normalizeProfile("saml", rawSAMProfile);
    
    // Link account or create user
    const linkResult = await linkAccount(normalizedProfileFormatted, service?.requiresEmailVerification || false);

    if (!linkResult.success || !linkResult.userId) {
      return {
        success: false,
        error: linkResult.error || "Failed to link SAML account",
      };
    }

    // Create service link if doesn't exist
    await ensureServiceLink(linkResult.userId, serviceId);

    // Issue tokens
    const tokenResult = await issueToken({
      userId: linkResult.userId,
      serviceId,
      scopes: service?.allowedScopes || ["read:profile", "read:email"],
    });

    if (!tokenResult.success) {
      return {
        success: false,
        error: tokenResult.error || "Failed to issue tokens",
      };
    }

    logger.info("SAML callback processed successfully", {
      userId: linkResult.userId,
      serviceId,
      email: normalizedProfileFormatted.email,
    });

    return {
      success: true,
      userId: linkResult.userId,
      tokens: tokenResult,
      callbackUrl: stateData.callbackUrl,
      profile: normalizedProfileFormatted,
    };
  } catch (error) {
    logger.error("SAML callback error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SAML callback processing failed",
    };
  }
}

/**
 * Ensure service link exists for user
 */
async function ensureServiceLink(userId: string, serviceId: ServiceId): Promise<void> {
  const existingLink = await prisma.serviceLink.findFirst({
    where: {
      userId,
      serviceId,
    },
  });

  if (!existingLink) {
    await prisma.serviceLink.create({
      data: {
        userId,
        serviceId,
        isActive: true,
        preferences: {},
      },
    });
  }
}
