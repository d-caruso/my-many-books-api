// ================================================================
// src/services/isbnService.ts
// ================================================================

import { OpenLibraryClient, openLibraryClient } from './openLibraryClient';
import { DataTransformer } from './dataTransformer';
import { validateIsbn, normalizeIsbn } from '@/utils/isbn';
import { 
  IsbnLookupResult, 
  BatchIsbnLookupResult, 
  TransformedBookData 
} from '@/types/bookData';

export interface IsbnServiceConfig {
  enableCache?: boolean;
  cacheExpiration?: number; // milliseconds
  maxCacheSize?: number;
  openLibraryClient?: OpenLibraryClient;
}

interface CacheEntry {
  data: TransformedBookData;
  timestamp: number;
}

export class IsbnService {
  private client: OpenLibraryClient;
  private cache: Map<string, CacheEntry>;
  private config: Required<IsbnServiceConfig>;

  constructor(config: IsbnServiceConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheExpiration: config.cacheExpiration ?? 60 * 60 * 1000, // 1 hour
      maxCacheSize: config.maxCacheSize ?? 1000,
      openLibraryClient: config.openLibraryClient ?? openLibraryClient,
    };

    this.client = this.config.openLibraryClient;
    this.cache = new Map();
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

    // Fetch from API
    try {
      const apiResult = await this.client.fetchBookByIsbn(normalizedIsbn);
      
      if (!apiResult.success) {
        return {
            success: false,
            isbn: normalizedIsbn,
            error: apiResult.error || 'Unknown API error',
            source: 'api',
            responseTime: Date.now() - startTime,
        };
    }

      // Transform the data
      const transformedBook = DataTransformer.transformBook(apiResult.book!, normalizedIsbn);

      // Cache the result
      if (this.config.enableCache) {
        this.cacheBook(normalizedIsbn, transformedBook);
      }

      return {
        success: true,
        isbn: normalizedIsbn,
        book: transformedBook,
        source: 'api',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Error in ISBN lookup:', error);
      return {
        success: false,
        isbn: normalizedIsbn,
        error: 'Unexpected error during book lookup',
        source: 'api',
        responseTime: Date.now() - startTime,
      };
    }
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