/**
 * NDIS myplace Authentication Service
 * Handles OAuth 2.0 authentication for NDIS myplace participant portal
 */

import {
  getNDISMyplaceConfig,
  validateNDISMyplaceConfig,
} from "@/lib/config/ndis-myplace";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export interface NDISMyplaceToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
}

export interface NDISMyplaceAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * NDIS myplace Authentication Service
 */
export class NDISMyplaceAuthService {
  private config = getNDISMyplaceConfig();

  constructor() {
    validateNDISMyplaceConfig(this.config);
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: this.config.scope,
      state: state || crypto.randomBytes(16).toString("hex"),
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<NDISMyplaceToken> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.callbackUrl,
      code,
    });

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `NDIS myplace token exchange failed: ${response.status} ${error}`
      );
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<NDISMyplaceToken> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `NDIS myplace token refresh failed: ${response.status} ${error}`
      );
    }

    return response.json();
  }

  /**
   * Store OAuth tokens for a user/participant
   */
  async storeTokens(
    userId: string,
    tokenData: NDISMyplaceToken
  ): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600);

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "ndis-myplace",
          providerAccountId: userId, // Use userId as providerAccountId
        },
      },
      update: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        token_type: tokenData.token_type,
        scope: tokenData.scope || this.config.scope,
        id_token: tokenData.id_token,
      },
      create: {
        userId,
        type: "oauth",
        provider: "ndis-myplace",
        providerAccountId: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        token_type: tokenData.token_type,
        scope: tokenData.scope || this.config.scope,
        id_token: tokenData.id_token,
      },
    });
  }

  /**
   * Get stored OAuth tokens for a user
   */
  async getStoredTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  } | null> {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "ndis-myplace",
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
              provider: "ndis-myplace",
            },
          });

          return {
            accessToken: updatedAccount?.access_token || "",
            refreshToken: updatedAccount?.refresh_token || undefined,
            expiresAt: updatedAccount?.expires_at || undefined,
          };
        } catch (error) {
          logger.error("Failed to refresh NDIS myplace token", { error, userId });
          return null;
        }
      }
      return null;
    }

    return {
      accessToken: account.access_token,
      refreshToken: account.refresh_token || undefined,
      expiresAt: account.expires_at || undefined,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const revokeUrl = this.config.apiUrl + "/oauth/revoke";

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
      throw new Error(
        `NDIS myplace token revocation failed: ${response.status} ${error}`
      );
    }
  }

  /**
   * Delete stored tokens for a user
   */
  async deleteStoredTokens(userId: string): Promise<void> {
    await prisma.account.deleteMany({
      where: {
        userId,
        provider: "ndis-myplace",
      },
    });
  }
}
