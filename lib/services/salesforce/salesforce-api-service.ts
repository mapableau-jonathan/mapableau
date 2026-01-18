/**
 * Salesforce API Service
 * Handles REST API calls to Salesforce
 */

import { getSalesforceConfig } from "@/lib/config/salesforce";
import { SalesforceOAuthService } from "./salesforce-oauth-service";
import { logger } from "@/lib/logger";

export interface SalesforceRecord {
  Id?: string;
  attributes?: {
    type: string;
    url: string;
  };
  [key: string]: any;
}

export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: SalesforceRecord[];
}

/**
 * Salesforce API Service
 */
export class SalesforceApiService {
  private config = getSalesforceConfig();
  private oauthService = new SalesforceOAuthService();

  /**
   * Get authenticated access token
   * Will use stored tokens or authenticate if needed
   */
  private async getAccessToken(userId?: string): Promise<string> {
    // If userId provided, try to get stored tokens
    if (userId) {
      const tokens = await this.oauthService.getStoredTokens(userId);
      if (tokens?.accessToken) {
        return tokens.accessToken;
      }
    }

    // If username/password configured, authenticate
    if (this.config.username && this.config.password) {
      const tokenData = await this.oauthService.authenticateWithUsernamePassword();
      // Update instance URL in config if not set
      if (!this.config.instanceUrl && tokenData.instance_url) {
        this.config.instanceUrl = tokenData.instance_url;
      }
      return tokenData.access_token;
    }

    throw new Error("No valid access token available. Please authenticate first.");
  }

  /**
   * Get instance URL
   */
  private async getInstanceUrl(userId?: string): Promise<string> {
    if (userId) {
      const tokens = await this.oauthService.getStoredTokens(userId);
      if (tokens?.instanceUrl) {
        return tokens.instanceUrl;
      }
    }

    if (this.config.instanceUrl) {
      return this.config.instanceUrl;
    }

    // Authenticate to get instance URL
    if (this.config.username && this.config.password) {
      const tokenData = await this.oauthService.authenticateWithUsernamePassword();
      return tokenData.instance_url;
    }

    throw new Error("No instance URL available. Please authenticate first.");
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    userId?: string
  ): Promise<Response> {
    const accessToken = await this.getAccessToken(userId);
    const instanceUrl = await this.getInstanceUrl(userId);
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${instanceUrl}/services/data/${this.config.apiVersion}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PATCH" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      logger.error("Salesforce API request failed", {
        method,
        endpoint,
        status: response.status,
        error,
      });
      throw new Error(`Salesforce API error: ${response.status} ${error}`);
    }

    return response;
  }

  /**
   * Query Salesforce using SOQL
   */
  async query(soql: string, userId?: string): Promise<SalesforceQueryResult> {
    const encodedQuery = encodeURIComponent(soql);
    const response = await this.makeRequest("GET", `/query?q=${encodedQuery}`, undefined, userId);
    return response.json();
  }

  /**
   * Get record by ID
   */
  async getRecord(
    objectType: string,
    recordId: string,
    fields?: string[],
    userId?: string
  ): Promise<SalesforceRecord> {
    const fieldsParam = fields ? `?fields=${fields.join(",")}` : "";
    const response = await this.makeRequest(
      "GET",
      `/sobjects/${objectType}/${recordId}${fieldsParam}`,
      undefined,
      userId
    );
    return response.json();
  }

  /**
   * Create record
   */
  async createRecord(
    objectType: string,
    data: Record<string, any>,
    userId?: string
  ): Promise<{ id: string; success: boolean; errors?: string[] }> {
    const response = await this.makeRequest("POST", `/sobjects/${objectType}/`, data, userId);
    return response.json();
  }

  /**
   * Update record
   */
  async updateRecord(
    objectType: string,
    recordId: string,
    data: Record<string, any>,
    userId?: string
  ): Promise<{ id: string; success: boolean; errors?: string[] }> {
    const response = await this.makeRequest(
      "PATCH",
      `/sobjects/${objectType}/${recordId}`,
      data,
      userId
    );
    return response.json();
  }

  /**
   * Delete record
   */
  async deleteRecord(objectType: string, recordId: string, userId?: string): Promise<void> {
    await this.makeRequest("DELETE", `/sobjects/${objectType}/${recordId}`, undefined, userId);
  }

  /**
   * Upsert record (create or update based on external ID)
   */
  async upsertRecord(
    objectType: string,
    externalIdField: string,
    externalId: string,
    data: Record<string, any>,
    userId?: string
  ): Promise<{ id: string; success: boolean; created: boolean; errors?: string[] }> {
    const response = await this.makeRequest(
      "PATCH",
      `/sobjects/${objectType}/${externalIdField}/${externalId}`,
      data,
      userId
    );

    const headers = response.headers;
    const isCreated = response.status === 201;

    const result: { id?: string; success: boolean; created: boolean; errors?: string[] } = {
      success: response.ok,
      created: isCreated,
    };

    if (response.ok) {
      const location = headers.get("Location");
      if (location) {
        const idMatch = location.match(/\/([a-zA-Z0-9]{15,18})$/);
        result.id = idMatch ? idMatch[1] : undefined;
      }
    } else {
      const errorData = await response.json();
      result.errors = errorData.map((e: any) => e.message) || ["Unknown error"];
    }

    return result;
  }

  /**
   * Get object metadata
   */
  async getObjectMetadata(objectType: string, userId?: string): Promise<any> {
    const response = await this.makeRequest("GET", `/sobjects/${objectType}/describe`, undefined, userId);
    return response.json();
  }

  /**
   * Search using SOSL
   */
  async search(sosl: string, userId?: string): Promise<SalesforceRecord[]> {
    const encodedSearch = encodeURIComponent(sosl);
    const response = await this.makeRequest("GET", `/search?q=${encodedSearch}`, undefined, userId);
    const data = await response.json();
    return data.searchRecords || [];
  }
}
