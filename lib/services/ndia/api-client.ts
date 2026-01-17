/**
 * NDIA API Client
 * Handles authentication and API communication with NDIA
 */

import { getNDIAConfig } from "@/lib/config/ndia-config";
import { logger } from "@/lib/logger";

export interface NDIAAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: Date;
}

export interface NDIAPlan {
  planNumber: string;
  participantId: string;
  status: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  remainingBudget: number;
  categories: Array<{
    code: string;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number;
  }>;
}

export interface NDIAProvider {
  providerNumber: string;
  name: string;
  status: string;
  serviceCategories: string[];
  registrationDate: string;
  expiryDate?: string;
}

export class NDIAApiClient {
  private config: ReturnType<typeof getNDIAConfig>;
  private accessToken: NDIAAccessToken | null = null;

  constructor() {
    this.config = getNDIAConfig();
  }

  /**
   * Get access token using OAuth 2.0 client credentials flow
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (
      this.accessToken &&
      this.accessToken.expires_at > new Date(Date.now() + 60000) // 1 minute buffer
    ) {
      return this.accessToken.access_token;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}${this.config.tokenEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: this.config.scope,
        }),
      });

      if (!response.ok) {
        throw new Error(`NDIA API authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      this.accessToken = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: expiresAt,
      };

      logger.info("NDIA API access token obtained", {
        expiresAt: expiresAt.toISOString(),
      });

      return this.accessToken.access_token;
    } catch (error) {
      logger.error("Error obtaining NDIA API access token", error);
      throw error;
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NDIA API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get NDIS plan for a participant
   */
  async getPlan(participantId: string): Promise<NDIAPlan | null> {
    try {
      // In production, this would be an actual API call
      // For now, return null (will be implemented when NDIA API is available)
      logger.info("NDIA API: getPlan called", { participantId });
      
      // TODO: Implement actual NDIA API call when available
      // const plan = await this.makeRequest<NDIAPlan>(
      //   `${this.config.planEndpoint}/${participantId}`
      // );
      // return plan;

      return null;
    } catch (error) {
      logger.error("Error fetching NDIS plan from NDIA", error);
      throw error;
    }
  }

  /**
   * Get provider information
   */
  async getProvider(providerNumber: string): Promise<NDIAProvider | null> {
    try {
      logger.info("NDIA API: getProvider called", { providerNumber });
      
      // TODO: Implement actual NDIA API call when available
      // const provider = await this.makeRequest<NDIAProvider>(
      //   `${this.config.providerEndpoint}/${providerNumber}`
      // );
      // return provider;

      return null;
    } catch (error) {
      logger.error("Error fetching provider from NDIA", error);
      throw error;
    }
  }

  /**
   * Verify provider registration status
   */
  async verifyProvider(providerNumber: string): Promise<{
    valid: boolean;
    status?: string;
    message?: string;
  }> {
    try {
      const provider = await this.getProvider(providerNumber);
      
      if (!provider) {
        return {
          valid: false,
          message: "Provider not found",
        };
      }

      const valid = provider.status === "ACTIVE" || provider.status === "REGISTERED";
      
      return {
        valid,
        status: provider.status,
        message: valid
          ? "Provider is registered and active"
          : `Provider status: ${provider.status}`,
      };
    } catch (error) {
      logger.error("Error verifying provider", error);
      return {
        valid: false,
        message: "Error verifying provider",
      };
    }
  }

  /**
   * Get price guide
   */
  async getPriceGuide(version?: string): Promise<any> {
    try {
      const endpoint = version
        ? `${this.config.priceGuideEndpoint}?version=${version}`
        : this.config.priceGuideEndpoint;

      logger.info("NDIA API: getPriceGuide called", { version });
      
      // TODO: Implement actual NDIA API call when available
      // const priceGuide = await this.makeRequest(endpoint);
      // return priceGuide;

      return null;
    } catch (error) {
      logger.error("Error fetching price guide from NDIA", error);
      throw error;
    }
  }
}
