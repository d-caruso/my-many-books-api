// ================================================================
// src/services/openLibraryClient.ts
// ================================================================

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { OpenLibraryResponse, OpenLibraryBook } from '@/types/openLibrary';
import { validateIsbn } from '@/utils/isbn';

export interface OpenLibraryClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface FetchBookResult {
  success: boolean;
  book?: OpenLibraryBook;
  error?: string;
  statusCode?: number | undefined;
}

export class OpenLibraryClient {
  private client: AxiosInstance;
  private config: Required<OpenLibraryClientConfig>;

  constructor(config: OpenLibraryClientConfig = {}) {
    this.config = {
        baseUrl: config.baseUrl || 'https://openlibrary.org',
        timeout: config.timeout || 10000,
        retries: config.retries || 3,
        retryDelay: config.retryDelay || 1000,
    };

    this.client = axios.create({
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout,
        headers: {
        'Accept': 'application/json',
        'User-Agent': 'My-Many-Books/1.0 (Book Management App)',
        },
    });

    try {
        this.setupInterceptors();
    } catch (error) {
        console.warn('Could not setup interceptors:', error);
    }
  }

  /**
   * Fetch book information by ISBN
   */
  async fetchBookByIsbn(isbn: string): Promise<FetchBookResult> {
    // Validate ISBN first
    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
        return {
        success: false,
        error: `Invalid ISBN: ${validation.error}`,
        };
    }

    const normalizedIsbn = validation.normalizedIsbn!;

    try {
        console.log(`Fetching book data for ISBN: ${normalizedIsbn}`);
        
        const response = await this.makeRequest(
        `/api/books?bibkeys=ISBN:${normalizedIsbn}&format=json&jscmd=data`
        );

        const data = response.data as OpenLibraryResponse;
        const bookKey = `ISBN:${normalizedIsbn}`;
        const book = data[bookKey];

        if (!book) {
        return {
            success: false,
            error: 'Book not found in Open Library',
            statusCode: 404,
        };
        }

        console.log(`Successfully fetched book: ${book.title || 'Unknown Title'}`);
        
        return {
        success: true,
        book,
        };
    } catch (error) {
        console.error('Error fetching book from Open Library:', error);
        
        if (error instanceof AxiosError) {
        return {
            success: false,
            error: this.getErrorMessage(error),
            statusCode: error.response?.status,
        };
        }

        return {
        success: false,
        error: 'Unknown error occurred while fetching book data',
        };
    }
    }

  /**
   * Fetch multiple books by ISBNs
   */
  async fetchBooksByIsbns(isbns: string[]): Promise<Record<string, FetchBookResult>> {
    const results: Record<string, FetchBookResult> = {};

    // Validate all ISBNs first
    const validIsbns: string[] = [];
    for (const isbn of isbns) {
      const validation = validateIsbn(isbn);
      if (validation.isValid) {
        validIsbns.push(validation.normalizedIsbn!);
      } else {
        results[isbn] = {
          success: false,
          error: `Invalid ISBN: ${validation.error}`,
        };
      }
    }

    if (validIsbns.length === 0) {
      return results;
    }

    try {
      // Open Library supports multiple ISBNs in one request
      const bibkeys = validIsbns.map(isbn => `ISBN:${isbn}`).join(',');
      const response = await this.makeRequest(
        `/api/books?bibkeys=${bibkeys}&format=json&jscmd=data`
      );

      const data = response.data as OpenLibraryResponse;

      // Process results
      for (const isbn of validIsbns) {
        const bookKey = `ISBN:${isbn}`;
        const book = data[bookKey];

        if (book) {
          results[isbn] = {
            success: true,
            book,
          };
        } else {
          results[isbn] = {
            success: false,
            error: 'Book not found in Open Library',
            statusCode: 404,
          };
        }
      }

      console.log(`Fetched ${validIsbns.length} books, ${Object.values(results).filter(r => r.success).length} successful`);
      
      return results;
    } catch (error) {
      console.error('Error fetching multiple books from Open Library:', error);
      
      // Return error for all valid ISBNs
      const errorMessage = error instanceof AxiosError 
        ? this.getErrorMessage(error)
        : 'Unknown error occurred while fetching book data';

      for (const isbn of validIsbns) {
        if (!results[isbn]) {
          results[isbn] = {
            success: false,
            error: errorMessage,
            statusCode: error instanceof AxiosError ? error.response?.status : undefined,
          };
        }
      }

      return results;
    }
  }

  /**
   * Search books by title (uses Open Library Search API)
   */
  async searchBooksByTitle(title: string, limit: number = 10): Promise<{
    success: boolean;
    books?: Array<{
      title?: string;
      author_name?: string[];
      isbn?: string[];
      publish_year?: number[];
      publisher?: string[];
      cover_i?: number;
    }>;
    error?: string;
  }> {
    if (!title || title.trim().length === 0) {
      return {
        success: false,
        error: 'Title is required for search',
      };
    }

    try {
      const response = await this.makeRequest(
        `/search.json?title=${encodeURIComponent(title.trim())}&limit=${limit}`
      );

      return {
        success: true,
        books: response.data.docs || [],
      };
    } catch (error) {
      console.error('Error searching books by title:', error);
      
      return {
        success: false,
        error: error instanceof AxiosError 
          ? this.getErrorMessage(error)
          : 'Unknown error occurred while searching books',
      };
    }
  }

  /**
   * Get book cover URL by ISBN
   */
  getCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'M'): string {
    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
      throw new Error(`Invalid ISBN: ${validation.error}`);
    }

    return `${this.config.baseUrl}/covers/isbn/${validation.normalizedIsbn}-${size}.jpg`;
  }

  /**
   * Check if Open Library service is available
   */
  async healthCheck(): Promise<{ available: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.makeRequest('/');
      const responseTime = Date.now() - startTime;
      
      return {
        available: true,
        responseTime,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof AxiosError 
          ? this.getErrorMessage(error)
          : 'Unknown error during health check',
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(url: string, attempt: number = 1): Promise<AxiosResponse> {
    try {
        console.log(`Making request to: ${url} (Attempt ${attempt})`);
        const response = await this.client.get(url);
        return response;
    } catch (error) {
        if (attempt < this.config.retries && this.shouldRetry(error)) {
        console.log(`Request failed, retrying (${attempt}/${this.config.retries})...`);
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest(url, attempt + 1);
        }
        
        // Re-throw the original error after all retries exhausted
        throw error;
    }
    }

  /**
   * Determine if error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof AxiosError)) {
      return false;
    }

    // Retry on network errors or 5xx server errors
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    return status >= 500 || status === 429; // Server error or rate limit
  }

  /**
   * Setup axios interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('Response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: AxiosError): string {
    if (!error.response) {
      return 'Network error - please check your internet connection';
    }

    switch (error.response.status) {
      case 404:
        return 'Book not found';
      case 429:
        return 'Rate limit exceeded - please try again later';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Open Library service is temporarily unavailable';
      default:
        return `Request failed with status ${error.response.status}`;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const openLibraryClient = new OpenLibraryClient();