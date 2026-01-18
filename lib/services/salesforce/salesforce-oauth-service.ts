/**
 * Salesforce OAuth Service
 * Handles OAuth 2.0 authentication flow for Salesforce integration
 */

import { getSalesforceConfig, validateSalesforceConfig } from "@/lib/config/salesforce";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export interface SalesforceOAuthToken {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceAuthResult {
  success: boolean;
  accessToken?: string;
  instanceUrl?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Salesforce OAuth Service
 */
export class SalesforceOAuthService {
  private config = getSalesforceConfig();

  constructor() {
    validateSalesforceConfig(this.config);
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: "api refresh_token",
      state: state || crypto.randomBytes(16).toString("hex"),
    });

    return `${this.config.loginUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (OAuth 2.0 flow)
   */
  async exchangeCodeForToken(code: string): Promise<SalesforceOAuthToken> {
    const tokenUrl = `${this.config.loginUrl}/services/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.callbackUrl,
      code,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce token exchange failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Authenticate using username/password (if configured)
   */
  async authenticateWithUsernamePassword(): Promise<SalesforceOAuthToken> {
    if (!this.config.username || !this.config.password) {
      throw new Error("Username and password are required for username/password authentication");
    }

    const tokenUrl = `${this.config.loginUrl}/services/oauth2/token`;

    // Combine password and security token for Salesforce
    const passwordWithToken = this.config.password + (this.config.securityToken || "");

    const params = new URLSearchParams({
      grant_type: "password",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: this.config.username,
      password: passwordWithToken,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce username/password auth failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SalesforceOAuthToken> {
    const tokenUrl = `${this.config.loginUrl}/services/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce token refresh failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Store OAuth tokens for a user
   */
  async storeTokens(
    userId: string,
    tokenData: SalesforceOAuthToken
  ): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + (2 * 60 * 60); // 2 hours (Salesforce default)

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "salesforce",
          providerAccountId: tokenData.id,
        },
      },
      update: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        token_type: tokenData.token_type,
        scope: "api refresh_token",
      },
      create: {
        userId,
        type: "oauth",
        provider: "salesforce",
        providerAccountId: tokenData.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        token_type: tokenData.token_type,
        scope: "api refresh_token",
      },
    });
  }

  /**
   * Get stored OAuth tokens for a user
   */
  async getStoredTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    instanceUrl?: string;
    expiresAt?: number;
  } | null> {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "salesforce",
      },
    });

    if (!account || !account.access_token) {
      return null;
    }

    // Check if token is expired
    if (account.expires_at && account.expires_at < Math.floor(Date.now() / 1000)) {
      // Token expired, try to refresh if refresh token available
      if (account.refresh_token) {
        try {
          const newTokenData = await this.refreshAccessToken(account.refresh_token);
          await this.storeTokens(userId, newTokenData);
          
          // Get updated account
          const updatedAccount = await prisma.account.findFirst({
            where: {
              userId,
              provider: "salesforce",
            },
          });

          return {
            accessToken: updatedAccount?.access_token || "",
            refreshToken: updatedAccount?.refresh_token || undefined,
            instanceUrl: this.config.instanceUrl,
            expiresAt: updatedAccount?.expires_at || undefined,
          };
        } catch (error) {
          logger.error("Failed to refresh Salesforce token", { error, userId });
          return null;
        }
      }
      return null;
    }

    return {
      accessToken: account.access_token,
      refreshToken: account.refresh_token || undefined,
      instanceUrl: this.config.instanceUrl,
      expiresAt: account.expires_at || undefined,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const revokeUrl = `${this.config.loginUrl}/services/oauth2/revoke`;

    const params = new URLSearchParams({
      token: accessToken,
    });

    const response = await fetch(revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok && response.status !== 400) {
      // 400 means token is already revoked or invalid
      const error = await response.text();
      throw new Error(`Salesforce token revocation failed: ${response.status} ${error}`);
    }
  }

  /**
   * Delete stored tokens for a user
   */
  async deleteStoredTokens(userId: string): Promise<void> {
    await prisma.account.deleteMany({
      where: {
        userId,
        provider: "salesforce",
      },
    });
  }
}
