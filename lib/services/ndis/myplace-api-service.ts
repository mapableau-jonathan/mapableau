/**
 * NDIS myplace API Service
 * Handles API calls to NDIS myplace participant portal
 */

import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { NDISMyplaceAuthService } from "./myplace-auth-service";
import { logger } from "@/lib/logger";

export interface NDISMyplacePlan {
  planNumber: string;
  participantId: string;
  status: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  remainingBudget: number;
  categories: Array<{
    code: string;
    name: string;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number;
  }>;
}

export interface NDISMyplaceProvider {
  providerNumber: string;
  name: string;
  status: string;
  serviceCategories: string[];
  registrationDate: string;
  expiryDate?: string;
  contact?: {
    email?: string;
    phone?: string;
  };
}

export interface NDISMyplaceBooking {
  id: string;
  providerNumber: string;
  serviceCode: string;
  bookingDate: string;
  status: string;
  amount: number;
  notes?: string;
}

export interface NDISMyplacePayment {
  id: string;
  transactionDate: string;
  amount: number;
  status: string;
  providerNumber?: string;
  serviceCode?: string;
  invoiceNumber?: string;
}

/**
 * NDIS myplace API Service
 */
export class NDISMyplaceApiService {
  private config = getNDISMyplaceConfig();
  private authService = new NDISMyplaceAuthService();

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    userId?: string
  ): Promise<T> {
    let accessToken: string;

    if (userId) {
      const tokens = await this.authService.getStoredTokens(userId);
      if (!tokens?.accessToken) {
        throw new Error(
          "No valid access token found. Please authenticate with NDIS myplace first."
        );
      }
      accessToken = tokens.accessToken;
    } else {
      throw new Error("User ID is required for NDIS myplace API requests");
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.config.apiUrl}/api/v1${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("NDIS myplace API request failed", {
        endpoint,
        status: response.status,
        error,
      });
      throw new Error(
        `NDIS myplace API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json();
  }

  /**
   * Get participant's NDIS plan details
   */
  async getPlan(userId: string): Promise<NDISMyplacePlan | null> {
    try {
      return await this.makeRequest<NDISMyplacePlan>("/plans/current", {}, userId);
    } catch (error) {
      logger.error("Error fetching NDIS plan from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Get all plans for participant
   */
  async getPlans(userId: string): Promise<NDISMyplacePlan[]> {
    try {
      return await this.makeRequest<NDISMyplacePlan[]>("/plans", {}, userId);
    } catch (error) {
      logger.error("Error fetching NDIS plans from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Get plan budget breakdown by category
   */
  async getPlanBudgets(userId: string, planNumber?: string): Promise<any> {
    try {
      const endpoint = planNumber
        ? `/plans/${planNumber}/budgets`
        : "/plans/current/budgets";
      return await this.makeRequest(endpoint, {}, userId);
    } catch (error) {
      logger.error("Error fetching plan budgets from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Search for NDIS service providers
   */
  async searchProviders(
    userId: string,
    params: {
      location?: string;
      category?: string;
      name?: string;
      postcode?: string;
    }
  ): Promise<NDISMyplaceProvider[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params.location) searchParams.append("location", params.location);
      if (params.category) searchParams.append("category", params.category);
      if (params.name) searchParams.append("name", params.name);
      if (params.postcode) searchParams.append("postcode", params.postcode);

      const queryString = searchParams.toString();
      const endpoint = queryString
        ? `/providers/search?${queryString}`
        : "/providers/search";

      return await this.makeRequest<NDISMyplaceProvider[]>(endpoint, {}, userId);
    } catch (error) {
      logger.error("Error searching providers from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Get provider details
   */
  async getProvider(
    userId: string,
    providerNumber: string
  ): Promise<NDISMyplaceProvider | null> {
    try {
      return await this.makeRequest<NDISMyplaceProvider>(
        `/providers/${providerNumber}`,
        {},
        userId
      );
    } catch (error) {
      logger.error("Error fetching provider from myplace", {
        error,
        userId,
        providerNumber,
      });
      throw error;
    }
  }

  /**
   * Get my providers (providers linked to participant)
   */
  async getMyProviders(userId: string): Promise<NDISMyplaceProvider[]> {
    try {
      return await this.makeRequest<NDISMyplaceProvider[]>("/providers/my", {}, userId);
    } catch (error) {
      logger.error("Error fetching my providers from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Create service booking
   */
  async createBooking(
    userId: string,
    booking: {
      providerNumber: string;
      serviceCode: string;
      bookingDate: string;
      amount: number;
      notes?: string;
    }
  ): Promise<NDISMyplaceBooking> {
    try {
      return await this.makeRequest<NDISMyplaceBooking>(
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify(booking),
        },
        userId
      );
    } catch (error) {
      logger.error("Error creating booking in myplace", { error, userId, booking });
      throw error;
    }
  }

  /**
   * Get service bookings
   */
  async getBookings(
    userId: string,
    filters?: {
      status?: string;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<NDISMyplaceBooking[]> {
    try {
      const searchParams = new URLSearchParams();
      if (filters?.status) searchParams.append("status", filters.status);
      if (filters?.fromDate) searchParams.append("fromDate", filters.fromDate);
      if (filters?.toDate) searchParams.append("toDate", filters.toDate);

      const queryString = searchParams.toString();
      const endpoint = queryString
        ? `/bookings?${queryString}`
        : "/bookings";

      return await this.makeRequest<NDISMyplaceBooking[]>(endpoint, {}, userId);
    } catch (error) {
      logger.error("Error fetching bookings from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPayments(
    userId: string,
    filters?: {
      fromDate?: string;
      toDate?: string;
      status?: string;
    }
  ): Promise<NDISMyplacePayment[]> {
    try {
      const searchParams = new URLSearchParams();
      if (filters?.fromDate) searchParams.append("fromDate", filters.fromDate);
      if (filters?.toDate) searchParams.append("toDate", filters.toDate);
      if (filters?.status) searchParams.append("status", filters.status);

      const queryString = searchParams.toString();
      const endpoint = queryString
        ? `/payments?${queryString}`
        : "/payments";

      return await this.makeRequest<NDISMyplacePayment[]>(endpoint, {}, userId);
    } catch (error) {
      logger.error("Error fetching payments from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Get participant profile/information
   */
  async getProfile(userId: string): Promise<any> {
    try {
      return await this.makeRequest("/profile", {}, userId);
    } catch (error) {
      logger.error("Error fetching profile from myplace", { error, userId });
      throw error;
    }
  }

  /**
   * Update participant profile
   */
  async updateProfile(userId: string, profileData: any): Promise<any> {
    try {
      return await this.makeRequest(
        "/profile",
        {
          method: "PATCH",
          body: JSON.stringify(profileData),
        },
        userId
      );
    } catch (error) {
      logger.error("Error updating profile in myplace", { error, userId, profileData });
      throw error;
    }
  }
}
