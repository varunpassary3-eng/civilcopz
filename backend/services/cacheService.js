const NodeCache = require('node-cache');
const { createClient } = require('redis');

// Cache service for national scale performance
class CacheService {
  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      maxKeys: 1000, // Maximum number of keys
    });

    this.redisClient = null;
    this.isRedisConnected = false;

    // Initialize Redis if configured
    this.initializeRedis();
  }

  async initializeRedis() {
    const redisUrl = process.env.REDIS_URL || `redis://127.0.0.1:6379`;
    const redisPassword = process.env.REDIS_PASSWORD;

    try {
      this.redisClient = createClient({
        url: redisUrl,
        password: redisPassword,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        }
      });

      await this.redisClient.connect();
      this.isRedisConnected = true;
      console.log('✅ Redis cache connected');

      // Handle Redis connection events
      this.redisClient.on('error', (err) => {
        console.error('Redis cache error:', err);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
      });

      this.redisClient.on('disconnect', () => {
        this.isRedisConnected = false;
      });

    } catch (error) {
      console.warn('⚠️ Redis cache not available, using memory cache only:', error.message);
      this.isRedisConnected = false;
    }
  }

  // Generic cache get method
  async get(key) {
    try {
      // Try Redis first if available
      if (this.isRedisConnected) {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      return this.memoryCache.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Generic cache set method
  async set(key, value, ttl = 300) {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis if available
      if (this.isRedisConnected) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      }

      // Always set in memory cache as backup
      this.memoryCache.set(key, value, ttl);

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (this.isRedisConnected) {
        await this.redisClient.del(key);
      }
      this.memoryCache.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear all cache
  async clear() {
    try {
      if (this.isRedisConnected) {
        await this.redisClient.flushAll();
      }
      this.memoryCache.flushAll();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Cache middleware for Express routes
  cacheMiddleware(ttl = 300, keyGenerator = null) {
    return async (req, res, next) => {
      try {
        // Generate cache key
        const cacheKey = keyGenerator
          ? keyGenerator(req)
          : `${req.method}:${req.originalUrl}`;

        // Check cache
        const cachedResponse = await this.get(cacheKey);
        if (cachedResponse) {
          return res.json(cachedResponse);
        }

        // Store original send method
        const originalSend = res.json;

        // Override res.json to cache the response
        res.json = function(data) {
          // Cache the response
          this.cacheService.set(cacheKey, data, ttl).catch(err =>
            console.error('Cache middleware error:', err)
          );

          // Call original method
          return originalSend.call(this, data);
        }.bind(res);

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Specific cache methods for common use cases

  // Cache company statistics
  async getCompanyStats(company) {
    const key = `company:stats:${company}`;
    return await this.get(key);
  }

  async setCompanyStats(company, stats, ttl = 600) { // 10 minutes
    const key = `company:stats:${company}`;
    return await this.set(key, stats, ttl);
  }

  // Cache case details
  async getCaseDetails(caseId) {
    const key = `case:details:${caseId}`;
    return await this.get(key);
  }

  async setCaseDetails(caseId, details, ttl = 300) { // 5 minutes
    const key = `case:details:${caseId}`;
    return await this.set(key, details, ttl);
  }

  // Cache user profile
  async getUserProfile(userId) {
    const key = `user:profile:${userId}`;
    return await this.get(key);
  }

  async setUserProfile(userId, profile, ttl = 1800) { // 30 minutes
    const key = `user:profile:${userId}`;
    return await this.set(key, profile, ttl);
  }

  // Invalidate cache patterns
  async invalidateUserCache(userId) {
    const patterns = [
      `user:profile:${userId}`,
      `case:details:*`, // Invalidate all case details (simplified)
    ];

    for (const pattern of patterns) {
      // For Redis, we can use SCAN for pattern matching
      if (this.isRedisConnected) {
        try {
          const keys = await this.redisClient.keys(pattern);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        } catch (error) {
          console.error('Redis pattern delete error:', error);
        }
      }

      // For memory cache, we need to check each key
      const keys = this.memoryCache.keys();
      for (const key of keys) {
        if (key.match(pattern.replace('*', '.*'))) {
          this.memoryCache.del(key);
        }
      }
    }
  }

  async invalidateCompanyCache(company) {
    const key = `company:stats:${company}`;
    await this.del(key);
  }

  // Get cache statistics
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0,
      },
      redis: {
        connected: this.isRedisConnected,
      }
    };
  }

  // Graceful shutdown
  async disconnect() {
    try {
      if (this.redisClient && this.isRedisConnected) {
        await this.redisClient.disconnect();
      }
      this.memoryCache.close();
      console.log('✅ Cache service disconnected');
    } catch (error) {
      console.error('❌ Cache service disconnect error:', error);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;