import cacheService from "./cache";
import logger from "./logger";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 3600 = 1 hour)
  key?: string | ((...args: any[]) => string); // Cache key generator
  condition?: (...args: any[]) => boolean; // Condition to cache
}

/**
 * Decorator to cache method results
 * Usage: @Cacheable({ ttl: 3600, key: 'employees:all' })
 */
export function Cacheable(options: CacheOptions = {}) {
  const { ttl = 3600, key, condition } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check if caching is enabled
      if (!cacheService || !process.env.REDIS_ENABLED) {
        return originalMethod.apply(this, args);
      }

      // Check custom condition
      if (condition && !condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      let cacheKey: string;
      if (typeof key === "function") {
        cacheKey = key(...args);
      } else if (typeof key === "string") {
        cacheKey = key;
      } else {
        cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(
          args
        )}`;
      }

      try {
        // Try to get from cache
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for ${cacheKey}`);
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Cache the result
        await cacheService.set(cacheKey, result, ttl);

        return result;
      } catch (error) {
        logger.error(`Cache error for ${cacheKey}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fallback to original method on error
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to invalidate cache on method execution
 * Usage: @CacheInvalidate({ patterns: ['employees:*'] })
 */
export function CacheInvalidate(options: { patterns: string[] }) {
  const { patterns } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache patterns
      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
        logger.debug(`Invalidated cache pattern: ${pattern}`);
      }

      return result;
    };

    return descriptor;
  };
}

 /**
 * Cache warmup utility
 */
export async function warmupCache(data: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
  const entries = data.map(item => [
    item.key,
    item.value,
    item.ttl || 3600
  ] as [string, any, number]);

  await cacheService.mset(entries);
  logger.info(`Warmed up cache with ${entries.length} entries`);
}
