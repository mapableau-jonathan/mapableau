/**
 * Redis Cache Client
 * Optional Redis integration for caching and rate limiting
 * 
 * Note: This is optional. The system works without Redis, but
 * Redis improves performance for high-traffic scenarios.
 */

import { logger } from "@/lib/logger";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class RedisClient {
  private client: any; // Redis client instance
  private isEnabled: boolean;
  private fallbackCache: Map<string, { value: any; expiresAt: number }> = new Map();

  constructor() {
    this.isEnabled = !!process.env.REDIS_URL;
    
    if (this.isEnabled) {
      this.initializeRedis();
    } else {
      logger.info("Redis not configured, using in-memory cache fallback");
    }
  }

  /**
   * Initialize Redis client
   */
  private async initializeRedis() {
    try {
      // Dynamic import to avoid requiring redis at build time
      const { createClient } = await import("redis");
      
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error("Redis connection failed after 10 retries");
              return new Error("Redis connection failed");
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on("error", (err: Error) => {
        logger.error("Redis client error", err);
      });

      this.client.on("connect", () => {
        logger.info("Redis client connected");
      });

      await this.client.connect();
    } catch (error) {
      logger.warn("Failed to initialize Redis, using fallback cache", error);
      this.isEnabled = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isEnabled && this.client) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to in-memory cache
        const entry = this.fallbackCache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
          return entry.value;
        }
        this.fallbackCache.delete(key);
        return null;
      }
    } catch (error) {
      logger.error("Cache get error", error, { key });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: unknown,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const ttl = options?.ttl || 3600; // Default 1 hour

      if (this.isEnabled && this.client) {
        await this.client.setEx(key, ttl, serialized);
        return true;
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.set(key, {
          value,
          expiresAt: Date.now() + ttl * 1000,
        });
        
        // Clean up expired entries periodically
        if (this.fallbackCache.size > 1000) {
          this.cleanupExpired();
        }
        
        return true;
      }
    } catch (error) {
      logger.error("Cache set error", error, { key });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.isEnabled && this.client) {
        await this.client.del(key);
        return true;
      } else {
        this.fallbackCache.delete(key);
        return true;
      }
    } catch (error) {
      logger.error("Cache delete error", error, { key });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isEnabled && this.client) {
        const result = await this.client.exists(key);
        return result === 1;
      } else {
        const entry = this.fallbackCache.get(key);
        return entry ? entry.expiresAt > Date.now() : false;
      }
    } catch (error) {
      logger.error("Cache exists error", error, { key });
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, by = 1): Promise<number> {
    try {
      if (this.isEnabled && this.client) {
        return await this.client.incrBy(key, by);
      } else {
        const current = await this.get<number>(key);
        const newValue = (current || 0) + by;
        await this.set(key, newValue, { ttl: 3600 });
        return newValue;
      }
    } catch (error) {
      logger.error("Cache increment error", error, { key });
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (this.isEnabled && this.client) {
        await this.client.expire(key, ttl);
        return true;
      } else {
        const entry = this.fallbackCache.get(key);
        if (entry) {
          entry.expiresAt = Date.now() + ttl * 1000;
        }
        return true;
      }
    } catch (error) {
      logger.error("Cache expire error", error, { key });
      return false;
    }
  }

  /**
   * Clean up expired entries from fallback cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.expiresAt <= now) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flush(): Promise<void> {
    try {
      if (this.isEnabled && this.client) {
        await this.client.flushDb();
      } else {
        this.fallbackCache.clear();
      }
    } catch (error) {
      logger.error("Cache flush error", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    size: number;
    keys?: number;
  }> {
    try {
      if (this.isEnabled && this.client) {
        const keys = await this.client.dbSize();
        return {
          enabled: true,
          size: keys,
          keys,
        };
      } else {
        return {
          enabled: false,
          size: this.fallbackCache.size,
        };
      }
    } catch (error) {
      logger.error("Cache stats error", error);
      return {
        enabled: false,
        size: 0,
      };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isEnabled && this.client) {
        await this.client.quit();
      }
    } catch (error) {
      logger.error("Redis disconnect error", error);
    }
  }
}

// Singleton instance
export const redisClient = new RedisClient();

// Cleanup on process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await redisClient.disconnect();
  });
}
