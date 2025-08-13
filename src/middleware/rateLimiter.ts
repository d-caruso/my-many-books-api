// ================================================================
// src/middleware/rateLimiter.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator: (event: APIGatewayProxyEvent) => string;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  enableHeaders: boolean;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: RateLimitConfig) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  public async checkLimit(event: APIGatewayProxyEvent): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(event);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequestTime: now
      };
      this.store.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count - 1,
      resetTime: entry.resetTime,
      retryAfter: 0
    };
  }

  public incrementCount(event: APIGatewayProxyEvent): void {
    const key = this.config.keyGenerator(event);
    const entry = this.store.get(key);
    
    if (entry) {
      entry.count++;
    }
  }

  public updateAfterResponse(event: APIGatewayProxyEvent, statusCode: number): void {
    const shouldSkip = 
      (this.config.skipSuccessfulRequests && statusCode < 400) ||
      (this.config.skipFailedRequests && statusCode >= 400);

    if (!shouldSkip) {
      this.incrementCount(event);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  public getStats(): RateLimiterStats {
    const now = Date.now();
    let activeEntries = 0;
    let totalRequests = 0;

    for (const entry of this.store.values()) {
      if (entry.resetTime > now) {
        activeEntries++;
        totalRequests += entry.count;
      }
    }

    return {
      activeEntries,
      totalRequests,
      storeSize: this.store.size,
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

export interface RateLimiterStats {
  activeEntries: number;
  totalRequests: number;
  storeSize: number;
  windowMs: number;
  maxRequests: number;
}

// Default key generators
export const keyGenerators = {
  // Rate limit by IP address
  byIp: (event: APIGatewayProxyEvent): string => {
    return event.requestContext.identity.sourceIp;
  },

  // Rate limit by API key
  byApiKey: (event: APIGatewayProxyEvent): string => {
    const apiKey = event.headers['X-Api-Key'] || 
                   event.headers['x-api-key'] || 
                   'anonymous';
    return `api:${apiKey}`;
  },

  // Rate limit by user (from auth context)
  byUser: (event: APIGatewayProxyEvent): string => {
    const userId = (event as any).authContext?.userId || 'anonymous';
    return `user:${userId}`;
  },

  // Rate limit by IP + endpoint combination
  byIpAndEndpoint: (event: APIGatewayProxyEvent): string => {
    const ip = event.requestContext.identity.sourceIp;
    const endpoint = `${event.httpMethod}:${event.resource}`;
    return `${ip}:${endpoint}`;
  },

  // Composite rate limiting (IP + API key)
  composite: (event: APIGatewayProxyEvent): string => {
    const ip = event.requestContext.identity.sourceIp;
    const apiKey = event.headers['X-Api-Key'] || 
                   event.headers['x-api-key'] || 
                   'anonymous';
    return `${ip}:${apiKey}`;
  }
};

// Middleware wrapper
export const withRateLimit = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  rateLimiter: RateLimiter,
  config: RateLimitConfig
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const limitResult = await rateLimiter.checkLimit(event);

    if (!limitResult.allowed) {
      const response: APIGatewayProxyResult = {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': limitResult.retryAfter.toString(),
          ...(config.enableHeaders && {
            'X-RateLimit-Limit': limitResult.limit.toString(),
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(limitResult.resetTime).toISOString()
          })
        },
        body: JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${limitResult.limit} per ${config.windowMs / 1000}s`,
          retryAfter: limitResult.retryAfter,
          code: 'RATE_LIMIT_EXCEEDED'
        })
      };
      return response;
    }

    try {
      const response = await handler(event);
      
      // Update rate limit after successful processing
      rateLimiter.updateAfterResponse(event, response.statusCode);

      // Add rate limit headers if enabled
      if (config.enableHeaders) {
        response.headers = {
          ...response.headers,
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(limitResult.resetTime).toISOString()
        };
      }

      return response;
    } catch (error) {
      // Update rate limit even for failed requests (unless configured to skip)
      rateLimiter.updateAfterResponse(event, 500);
      throw error;
    }
  };
};

// Factory functions for common rate limiting scenarios
export const createRateLimiters = () => {
  return {
    // Global rate limiter (by IP)
    global: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000,
      keyGenerator: keyGenerators.byIp,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      enableHeaders: true
    }),

    // API endpoint rate limiter
    apiEndpoint: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute  
      maxRequests: 100,
      keyGenerator: keyGenerators.byIpAndEndpoint,
      skipSuccessfulRequests: false,
      skipFailedRequests: true,
      enableHeaders: true
    }),

    // Heavy operations rate limiter (like ISBN lookups)
    heavyOps: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: keyGenerators.byIp,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      enableHeaders: true
    }),

    // User-specific rate limiter
    perUser: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
      keyGenerator: keyGenerators.byUser,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      enableHeaders: true
    })
  };
};