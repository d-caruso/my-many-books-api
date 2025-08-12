// ================================================================
// src/services/isbnService.ts
// ================================================================

import { OpenLibraryClient, openLibraryClient } from './openLibraryClient';
import { DataTransformer } from './dataTransformer';
import { FallbackService } from './fallbackService';
import { CircuitBreaker, CircuitBreakerConfig } from '@/utils/circuitBreaker';
import { RetryPolicy, RetryConfig } from '@/utils/retryPolicy';
import { validateIsbn, normalizeIsbn } from '@/utils/isbn';
import { 
  IsbnLookupResult, 
  BatchIsbnLookupResult, 
  TransformedBookData 
} from '@/types/bookData';

export interface IsbnServiceConfig {
  enableCache?: boolean;
  cacheExpiration?: number;
  maxCacheSize?: number;
  openLibraryClient?: OpenLibraryClient;
  enableFallback?: boolean;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  retryConfig?: Partial<RetryConfig>;
}

interface CacheEntry {
  data: TransformedBookData;
  timestamp: number;
}

export class IsbnService {
  private client: OpenLibraryClient;
  private cache: Map<string, CacheEntry>;
  private config: Required<IsbnServiceConfig>;
  private fallbackService: FallbackService;
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;

  constructor(config: IsbnServiceConfig = {}) {
    // Create complete configs by merging defaults with user config
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 30000, // 30 seconds
      ...config.circuitBreakerConfig,
    };

    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: true,
      ...config.retryConfig,
    };

    this.config = {
      enableCache: config.enableCache ?? true,
      cacheExpiration: config.cacheExpiration ?? 60 * 60 * 1000,
      maxCacheSize: config.maxCacheSize ?? 1000,
      openLibraryClient: config.openLibraryClient ?? openLibraryClient,
      enableFallback: config.enableFallback ?? true,
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      enableRetry: config.enableRetry ?? true,
      circuitBreakerConfig,
      retryConfig,
    };

    this.client = this.config.openLibraryClient;
    this.cache = new Map();
    this.fallbackService = new FallbackService();
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    this.retryPolicy = new RetryPolicy(retryConfig);
  }

  /**
   * Look up a single book by ISBN
   */
  async lookupBook(isbn: string): Promise<IsbnLookupResult> {
    const startTime = Date.now();

    // Validate ISBN first
    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
      return {
        success: false,
        isbn,
        error: `Invalid ISBN: ${validation.error}`,
        source: 'validation_error',
        responseTime: Date.now() - startTime,
      };
    }

    const normalizedIsbn = validation.normalizedIsbn!;

    // Check cache first
    if (this.config.enableCache) {
      const cached = this.getCachedBook(normalizedIsbn);
      if (cached) {
        return {
          success: true,
          isbn: normalizedIsbn,
          book: cached,
          source: 'cache',
          responseTime: Date.now() - startTime,
        };
      }
    }

    // Try API with resilience features
    try {
      const apiResult = await this.fetchWithResilience(normalizedIsbn);
      
      if (apiResult.success && apiResult.book) {
        // Cache successful result
        if (this.config.enableCache) {
          this.cacheBook(normalizedIsbn, apiResult.book);
        }

        return {
          ...apiResult,
          isbn: normalizedIsbn,
          source: 'api',
          responseTime: Date.now() - startTime,
        };
      } else {
        // API failed, try fallback
        return this.handleApiFallback(normalizedIsbn, apiResult.error || 'API request failed', startTime);
      }
    } catch (error) {
      console.error('Error in resilient ISBN lookup:', error);
      return this.handleApiFallback(normalizedIsbn, 'Unexpected error during book lookup', startTime);
    }
  }

  /**
   * Fetch book data with circuit breaker and retry logic
   */
  private async fetchWithResilience(isbn: string): Promise<{
    success: boolean;
    book?: TransformedBookData;
    error?: string;
  }> {
    const operation = async () => {
      if (this.config.enableRetry) {
        const retryResult = await this.retryPolicy.execute(async () => {
          return await this.client.fetchBookByIsbn(isbn);
        });

        if (!retryResult.success) {
          throw retryResult.error || new Error('Retry policy exhausted');
        }

        const apiResult = retryResult.result!;
        if (!apiResult.success) {
          throw new Error(apiResult.error || 'API request failed');
        }

        return apiResult;
      } else {
        return await this.client.fetchBookByIsbn(isbn);
      }
    };

    try {
      let apiResult;
      
      if (this.config.enableCircuitBreaker) {
        apiResult = await this.circuitBreaker.execute(operation);
      } else {
        apiResult = await operation();
      }

      if (apiResult.success && apiResult.book) {
        const transformedBook = DataTransformer.transformBook(apiResult.book, isbn);
        return {
          success: true,
          book: transformedBook,
        };
      } else {
        return {
          success: false,
          error: apiResult.error || 'API request failed',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle API failure with fallback mechanisms
   */
  private handleApiFallback(isbn: string, error: string, startTime: number): IsbnLookupResult {
    if (this.config.enableFallback) {
      console.log(`API failed for ISBN ${isbn}, attempting fallback...`);
      
      const fallbackResult = this.fallbackService.getFallbackBook(isbn);
      if (fallbackResult) {
        return {
          ...fallbackResult,
          error: `API unavailable, using fallback data. Original error: ${error}`,
          responseTime: Date.now() - startTime,
        };
      }
    }

    return {
      success: false,
      isbn,
      error,
      source: 'api',
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Get service resilience statistics
   */
  getResilienceStats(): {
    circuitBreaker: ReturnType<CircuitBreaker['getStats']>;
    fallback: ReturnType<FallbackService['getStats']>;
    cache: ReturnType<IsbnService['getCacheStats']>;
    config: {
      enableCache: boolean;
      enableFallback: boolean;
      enableCircuitBreaker: boolean;
      enableRetry: boolean;
    };
  } {
    return {
      circuitBreaker: this.circuitBreaker.getStats(),
      fallback: this.fallbackService.getStats(),
      cache: this.getCacheStats(),
      config: {
        enableCache: this.config.enableCache,
        enableFallback: this.config.enableFallback,
        enableCircuitBreaker: this.config.enableCircuitBreaker,
        enableRetry: this.config.enableRetry,
      },
    };
  }

  /**
   * Reset all resilience mechanisms
   */
  resetResilience(): void {
    this.circuitBreaker.reset();
    this.fallbackService.clearStaticData();
    this.clearCache();
  }

  /**
   * Add fallback book data for testing or common books
   */
  addFallbackBook(isbn: string, title: string): boolean {
    return this.fallbackService.addStaticBookData(isbn, {
      title,
      source: 'manual',
      confidence: 'medium',
    });
  }

  /**
   * Look up multiple books by ISBN
   */
  async lookupBooks(isbns: string[]): Promise<BatchIsbnLookupResult> {
    const results: Record<string, IsbnLookupResult> = {};
    const errors: string[] = [];
    let successCount = 0;
    let cachedCount = 0;
    let apiCallCount = 0;

    // Validate all ISBNs first
    const validIsbns: string[] = [];
    for (const isbn of isbns) {
      const validation = validateIsbn(isbn);
      if (validation.isValid) {
        validIsbns.push(validation.normalizedIsbn!);
      } else {
        results[isbn] = {
          success: false,
          isbn,
          error: `Invalid ISBN: ${validation.error}`,
          source: 'validation_error',
        };
        errors.push(`Invalid ISBN ${isbn}: ${validation.error}`);
      }
    }

    // Check cache for valid ISBNs
    const uncachedIsbns: string[] = [];
    if (this.config.enableCache) {
      for (const isbn of validIsbns) {
        const cached = this.getCachedBook(isbn);
        if (cached) {
          results[isbn] = {
            success: true,
            isbn,
            book: cached,
            source: 'cache',
          };
          successCount++;
          cachedCount++;
        } else {
          uncachedIsbns.push(isbn);
        }
      }
    } else {
      uncachedIsbns.push(...validIsbns);
    }

    // Fetch uncached books from API in batches
    if (uncachedIsbns.length > 0) {
      try {
        const apiResults = await this.client.fetchBooksByIsbns(uncachedIsbns);
        apiCallCount = 1; // Single batch API call

        for (const [isbn, apiResult] of Object.entries(apiResults)) {
          if (apiResult.success && apiResult.book) {
            try {
              const transformedBook = DataTransformer.transformBook(apiResult.book, isbn);
              
              // Cache the result
              if (this.config.enableCache) {
                this.cacheBook(isbn, transformedBook);
              }

              results[isbn] = {
                success: true,
                isbn,
                book: transformedBook,
                source: 'api',
              };
              successCount++;
            } catch (transformError) {
              const errorMsg = `Failed to transform book data for ISBN ${isbn}`;
              results[isbn] = {
                success: false,
                isbn,
                error: errorMsg,
                source: 'api',
              };
              errors.push(errorMsg);
            }
          } else {
            results[isbn] = {
              success: false,
              isbn,
              error: apiResult.error || 'Unknown API error',
              source: 'api',
            };
            errors.push(`API error for ISBN ${isbn}: ${apiResult.error}`);
          }
        }
      } catch (error) {
        const errorMsg = 'Batch API request failed';
        console.error(errorMsg, error);
        
        // Mark all uncached ISBNs as failed
        for (const isbn of uncachedIsbns) {
          results[isbn] = {
            success: false,
            isbn,
            error: errorMsg,
            source: 'api',
          };
        }
        errors.push(errorMsg);
      }
    }

    return {
      results,
      summary: {
        total: isbns.length,
        successful: successCount,
        failed: isbns.length - successCount,
        cached: cachedCount,
        apiCalls: apiCallCount,
      },
      errors,
    };
  }

  /**
   * Search books by title using Open Library search
   */
  async searchByTitle(title: string, limit: number = 10): Promise<{
    success: boolean;
    books?: Array<{
      title: string;
      authors: string[];
      isbns: string[];
      publishYear?: number | undefined;
      coverUrl?: string | undefined;
    }> | undefined;
    error?: string | undefined;
  }> {
    try {
      const searchResult = await this.client.searchBooksByTitle(title, limit);
      
      if (!searchResult.success) {
        return {
          success: false,
          error: searchResult.error || 'Unknown search error',
        };
      }

      const books = (searchResult.books || []).map(book => ({
        title: book.title || 'Unknown Title',
        authors: book.author_name || [],
        isbns: book.isbn || [],
        publishYear: book.publish_year?.[0],
        coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : undefined,
      }));

      return {
        success: true,
        books,
      };
    } catch (error) {
      console.error('Error searching books by title:', error);
      return {
        success: false,
        error: 'Unexpected error during title search',
      };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number | undefined;
    oldestEntry?: Date | undefined;
    newestEntry?: Date | undefined;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(entry => entry.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if Open Library service is available
   */
  async checkServiceHealth(): Promise<{
    available: boolean;
    responseTime?: number;
    error?: string;
    cacheStats: ReturnType<IsbnService['getCacheStats']>;
  }> {
    const healthCheck = await this.client.healthCheck();
    
    return {
      ...healthCheck,
      cacheStats: this.getCacheStats(),
    };
  }

  // Private cache methods
  private getCachedBook(isbn: string): TransformedBookData | null {
    if (!this.config.enableCache) {
      return null;
    }

    const entry = this.cache.get(isbn);
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.config.cacheExpiration) {
      this.cache.delete(isbn);
      return null;
    }

    return entry.data;
  }

  private cacheBook(isbn: string, book: TransformedBookData): void {
    if (!this.config.enableCache) {
      return;
    }

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestEntries();
    }

    this.cache.set(isbn, {
      data: book,
      timestamp: Date.now(),
    });
  }

  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const removeCount = Math.floor(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      const entry = entries[i];
        if (entry) {
            this.cache.delete(entry[0]);
        }
    }
  }
}

// Export singleton instance
export const isbnService = new IsbnService();