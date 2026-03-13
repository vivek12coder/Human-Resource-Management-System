import Redis from "ioredis";
import logger from "./logger";

/**
 * Cache Service with Redis
 * Provides centralized caching with automatic expiration and key management
 */
class CacheService {
  private redis: Redis | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.REDIS_ENABLED !== "false";
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info("Cache service disabled");
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      this.redis.on("error", (err) => {
        logger.error("Redis connection error", { error: err.message });
        this.redis = null;
      });

      this.redis.on("connect", () => {
        logger.info("Redis connected successfully");
      });

      // Test connection
      await this.redis.ping();
      logger.info("Redis cache service initialized");
    } catch (error: any) {
      logger.warn("Failed to initialize Redis cache", { error: error.message });
      this.isEnabled = false;
      this.redis = null;
    }
  }

  /**
   * Cache key generator with namespace
   */
  generateKey(namespace: string, identifier: string | object): string {
    const id =
      typeof identifier === "string"
        ? identifier
        : JSON.stringify(identifier);
    return `${namespace}:${id}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value) as T;
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error: any) {
      logger.error(`Cache get error for ${key}`, { error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with optional expiration
   */
  async set(
    key: string,
    value: any,
    ttl: number = 3600 // 1 hour default
  ): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error: any) {
      logger.error(`Cache set error for ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error: any) {
      logger.error(`Cache delete error for ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug(`Deleted ${keys.length} cache keys matching ${pattern}`);
      }
      return keys.length;
    } catch (error: any) {
      logger.error(`Cache deletePattern error for ${pattern}`, {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.flushdb();
      logger.info("Cache cleared");
      return true;
    } catch (error: any) {
      logger.error("Cache clear error", { error: error.message });
      return false;
    }
  }

  /**
   * Get or set: fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh value
    const value = await fetcher();

    // Cache the value
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    if (!this.redis || keys.length === 0) {
      return new Map();
    }

    try {
      const values = await this.redis.mget(keys);
      const result = new Map<string, T | null>();

      keys.forEach((key, index) => {
        const value = values[index];
        result.set(key, value ? (JSON.parse(value) as T) : null);
      });

      return result;
    } catch (error: any) {
      logger.error("Cache mget error", { error: error.message });
      return new Map();
    }
  }

  /**
   * Set multiple values
   */
  async mset(
    entries: Array<[key: string, value: any, ttl?: number]>
  ): Promise<boolean> {
    if (!this.redis || entries.length === 0) return false;

    try {
      // Use pipeline for better performance
      const pipeline = this.redis.pipeline();

      entries.forEach(([key, value, ttl]) => {
        const serialized = JSON.stringify(value);
        if (ttl && ttl > 0) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();
      logger.debug(`Cached ${entries.length} items`);
      return true;
    } catch (error: any) {
      logger.error("Cache mset error", { error: error.message });
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    if (!this.redis) return 0;

    try {
      const value = await this.redis.incrby(key, by);
      return value;
    } catch (error: any) {
      logger.error(`Cache increment error for ${key}`, {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.redis) return null;

    try {
      const info = await this.redis.info("stats");
      return info;
    } catch (error: any) {
      logger.error("Cache stats error", { error: error.message });
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info("Redis connection closed");
    }
  }
}

export default new CacheService();
