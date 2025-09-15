import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

// Create cache instances with different TTL for different purposes
const shortCache = new NodeCache({ stdTTL: 60 }); // 1 minute cache for frequently changing data
const mediumCache = new NodeCache({ stdTTL: 300 }); // 5 minute cache for moderately changing data
const longCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache for rarely changing data

export enum CacheDuration {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
}

// Generate cache key from request
const generateCacheKey = (req: Request): string => {
  const { originalUrl, method, params, query, body } = req;
  const keyData: any = {
    url: originalUrl,
    method,
    params,
    query,
    userId: req.user?.id,
  };
  
  // Don't include body for GET requests
  if (method !== 'GET') {
    keyData['body'] = body;
  }
  
  return createHash('md5').update(JSON.stringify(keyData)).digest('hex');
};

// Cache middleware factory
export const cacheMiddleware = (duration: CacheDuration = CacheDuration.SHORT) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests unless specified
    if (req.method !== 'GET' && !req.headers['x-cache-write']) {
      return next();
    }
    
    const cacheKey = generateCacheKey(req);
    let cache: NodeCache;
    
    switch (duration) {
      case CacheDuration.LONG:
        cache = longCache;
        break;
      case CacheDuration.MEDIUM:
        cache = mediumCache;
        break;
      default:
        cache = shortCache;
    }
    
    // Try to get cached response
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json(cachedData);
    }
    
    // Store original send method
    const originalSend = res.json.bind(res);
    
    // Override json method to cache response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
      }
      
      return originalSend(data);
    };
    
    next();
  };
};

// Clear cache for specific patterns
export const clearCache = (pattern?: string) => {
  if (!pattern) {
    shortCache.flushAll();
    mediumCache.flushAll();
    longCache.flushAll();
    return;
  }
  
  // Clear matching keys from all caches
  [shortCache, mediumCache, longCache].forEach(cache => {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    matchingKeys.forEach(key => cache.del(key));
  });
};

// Invalidate cache middleware
export const invalidateCache = (patterns: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.json.bind(res);
    
    // Override json method to invalidate cache after successful operation
    res.json = function(data: any) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => clearCache(pattern));
      }
      
      return originalSend(data);
    };
    
    next();
  };
};

// Cache warming function for critical data
export const warmCache = async () => {
  logger.debug('Warming cache for critical endpoints...');
  
  // Add cache warming logic here for frequently accessed endpoints
  // This would typically make internal calls to populate the cache
  
  logger.debug('[OK] Cache warming completed');
};

// Get cache statistics
export const getCacheStats = () => {
  return {
    short: {
      keys: shortCache.keys().length,
      stats: shortCache.getStats(),
    },
    medium: {
      keys: mediumCache.keys().length,
      stats: mediumCache.getStats(),
    },
    long: {
      keys: longCache.keys().length,
      stats: longCache.getStats(),
    },
  };
};