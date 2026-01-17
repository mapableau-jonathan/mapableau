/**
 * NDIA Price Guide Synchronization
 * Syncs NDIS price guide from NDIA
 */

import { NDIAApiClient } from "./api-client";
import { logger } from "@/lib/logger";

export interface PriceGuideItem {
  supportItemNumber: string;
  supportItemName: string;
  category: string;
  unit: string;
  price: number;
  effectiveDate: Date;
  expiryDate?: Date;
}

export class PriceGuideService {
  private ndiaClient: NDIAApiClient;
  private cache: Map<string, { data: PriceGuideItem[]; expiresAt: Date }> =
    new Map();

  constructor() {
    this.ndiaClient = new NDIAApiClient();
  }

  /**
   * Get price guide (with caching)
   */
  async getPriceGuide(version?: string): Promise<PriceGuideItem[]> {
    const cacheKey = version || "latest";

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    try {
      const priceGuide = await this.ndiaClient.getPriceGuide(version);

      if (!priceGuide) {
        logger.warn("Price guide not available from NDIA API");
        return [];
      }

      // Transform to our format
      const items: PriceGuideItem[] = (priceGuide.items || []).map((item: any) => ({
        supportItemNumber: item.supportItemNumber,
        supportItemName: item.supportItemName,
        category: item.category,
        unit: item.unit,
        price: item.price,
        effectiveDate: new Date(item.effectiveDate),
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      }));

      // Cache for 24 hours
      this.cache.set(cacheKey, {
        data: items,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      logger.info("Price guide synchronized", {
        version,
        itemCount: items.length,
      });

      return items;
    } catch (error) {
      logger.error("Error fetching price guide", error);
      throw error;
    }
  }

  /**
   * Get price for a specific support item
   */
  async getPrice(
    supportItemNumber: string,
    version?: string
  ): Promise<number | null> {
    const priceGuide = await this.getPriceGuide(version);
    const item = priceGuide.find(
      (item) => item.supportItemNumber === supportItemNumber
    );

    return item?.price || null;
  }

  /**
   * Validate service code against price guide
   */
  async validateServiceCode(serviceCode: string): Promise<{
    valid: boolean;
    item?: PriceGuideItem;
    message?: string;
  }> {
    const priceGuide = await this.getPriceGuide();
    const item = priceGuide.find(
      (item) => item.supportItemNumber === serviceCode
    );

    if (!item) {
      return {
        valid: false,
        message: "Service code not found in NDIS price guide",
      };
    }

    // Check if item is still effective
    if (item.expiryDate && item.expiryDate < new Date()) {
      return {
        valid: false,
        item,
        message: "Service code has expired",
      };
    }

    return {
      valid: true,
      item,
      message: "Service code is valid",
    };
  }
}
