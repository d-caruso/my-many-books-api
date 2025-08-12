// ================================================================
// tests/services/isbnService.test.ts
// ================================================================

import { IsbnService } from '@/services/isbnService';
import { OpenLibraryClient } from '@/services/openLibraryClient';
import { FallbackService } from '@/services/fallbackService';
import { DataTransformer } from '@/services/dataTransformer';
import { CircuitBreaker, CircuitBreakerState } from '@/utils/circuitBreaker';
import { RetryPolicy } from '@/utils/retryPolicy';
import { validateIsbn } from '@/utils/isbn';
import { TransformedBookData } from '@/types/bookData';
import { OpenLibraryBook } from '@/types/openLibrary';

// Mock dependencies
jest.mock('@/services/openLibraryClient');
jest.mock('@/services/fallbackService');
jest.mock('@/services/dataTransformer');
jest.mock('@/utils/circuitBreaker');
jest.mock('@/utils/retryPolicy');
jest.mock('@/utils/isbn');

describe('IsbnService', () => {
  let isbnService: IsbnService;
  let mockOpenLibraryClient: jest.Mocked<OpenLibraryClient>;
  let mockFallbackService: jest.Mocked<FallbackService>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreaker>;
  let mockRetryPolicy: jest.Mocked<RetryPolicy>;
  let mockValidateIsbn: jest.MockedFunction<typeof validateIsbn>;

  const mockOpenLibraryBook: OpenLibraryBook = {
    title: 'The Odyssey',
    subtitle: 'An Epic Poem',
    authors: [{ name: 'Homer' }],
    subjects: ['Fiction', 'Classics', 'Epic poetry'],
    publishers: ['Penguin Classics'],
    publish_date: '1997-05-01',
    number_of_pages: 541,
    physical_format: 'Paperback',
    isbn_10: ['0140449132'],
    isbn_13: ['9780140449136'],
    cover: {
      small: 'https://covers.openlibrary.org/b/isbn/9780140449136-S.jpg',
      medium: 'https://covers.openlibrary.org/b/isbn/9780140449136-M.jpg',
      large: 'https://covers.openlibrary.org/b/isbn/9780140449136-L.jpg',
    },
    languages: [{ key: '/languages/eng' }],
    weight: '340g',
  };

  const mockTransformedBookData: TransformedBookData = {
    isbnCode: '9780140449136',
    title: 'The Odyssey',
    subtitle: 'An Epic Poem',
    authors: [{
      name: 'Homer',
      surname: '',
      fullName: 'Homer',
      nationality: 'Ancient Greek',
    }],
    categories: [
      { name: 'Fiction', type: 'genre' },
      { name: 'Classics', type: 'genre' }
    ],
    publishers: ['Penguin Classics'],
    pages: 541,
    language: 'en',
    coverUrls: {
      small: 'https://covers.openlibrary.org/b/isbn/9780140449136-S.jpg',
      medium: 'https://covers.openlibrary.org/b/isbn/9780140449136-M.jpg',
      large: 'https://covers.openlibrary.org/b/isbn/9780140449136-L.jpg',
    },
    description: 'Homer\'s epic poem of Odysseus\' journey home.',
    physicalFormat: 'Paperback',
    weight: '340g',
    editionDate: new Date('1997-05-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockOpenLibraryClient = {
      fetchBookByIsbn: jest.fn(),
      fetchBooksByIsbns: jest.fn(),
      searchBooksByTitle: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockFallbackService = {
      getFallbackBook: jest.fn(),
      addStaticBookData: jest.fn(),
      clearStaticData: jest.fn(),
      getStats: jest.fn(),
    } as any;

    mockCircuitBreaker = {
      execute: jest.fn(),
      getState: jest.fn(),
      getStats: jest.fn(),
      reset: jest.fn(),
    } as any;

    mockRetryPolicy = {
      execute: jest.fn(),
    } as any;

    mockValidateIsbn = validateIsbn as jest.MockedFunction<typeof validateIsbn>;

    // Mock constructors to return our mocked instances
    (OpenLibraryClient as jest.Mock).mockImplementation(() => mockOpenLibraryClient);
    (FallbackService as jest.Mock).mockImplementation(() => mockFallbackService);
    (CircuitBreaker as jest.Mock).mockImplementation(() => mockCircuitBreaker);
    (RetryPolicy as jest.Mock).mockImplementation(() => mockRetryPolicy);

    // Mock DataTransformer
    jest.spyOn(DataTransformer, 'transformBook').mockReturnValue(mockTransformedBookData);

    // Default mock implementations
    mockOpenLibraryClient.fetchBooksByIsbns.mockResolvedValue({});
    mockOpenLibraryClient.searchBooksByTitle.mockResolvedValue({
      success: false,
      error: 'Default mock error',
    });
    mockOpenLibraryClient.healthCheck.mockResolvedValue({
      available: false,
      error: 'Default mock error',
    });

    isbnService = new IsbnService({
      openLibraryClient: mockOpenLibraryClient,
    });
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const service = new IsbnService();
      expect(service).toBeInstanceOf(IsbnService);
      expect(CircuitBreaker).toHaveBeenCalledWith({
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 30000,
      });
      expect(RetryPolicy).toHaveBeenCalledWith({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: true,
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        enableCache: false,
        cacheExpiration: 30000,
        maxCacheSize: 500,
        enableFallback: false,
        enableCircuitBreaker: false,
        enableRetry: false,
        circuitBreakerConfig: {
          failureThreshold: 3,
        },
        retryConfig: {
          maxAttempts: 5,
        },
      };

      new IsbnService(customConfig);

      expect(CircuitBreaker).toHaveBeenCalledWith({
        failureThreshold: 3,
        resetTimeout: 60000,
        monitoringPeriod: 30000,
      });
      expect(RetryPolicy).toHaveBeenCalledWith({
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: true,
      });
    });
  });

  describe('lookupBook', () => {
    beforeEach(() => {
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });
    });

    it('should return error for invalid ISBN', async () => {
      mockValidateIsbn.mockReturnValue({
        isValid: false,
        error: 'Invalid ISBN format',
      });

      const result = await isbnService.lookupBook('invalid-isbn');

      expect(result).toEqual({
        success: false,
        isbn: 'invalid-isbn',
        error: 'Invalid ISBN: Invalid ISBN format',
        source: 'validation_error',
        responseTime: expect.any(Number),
      });
    });

    it('should return cached result when available', async () => {
      // First, populate cache
      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: mockOpenLibraryBook,
      });

      await isbnService.lookupBook('9780140449136');

      // Second call should return cached result
      const result = await isbnService.lookupBook('9780140449136');

      expect(result.source).toBe('cache');
      expect(result.success).toBe(true);
    });

    it('should fetch from API when not cached', async () => {
      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: mockOpenLibraryBook,
      });

      const result = await isbnService.lookupBook('9780140449136');

      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.source).toBe('api');
    });

    it('should handle API failure with fallback', async () => {
      mockCircuitBreaker.execute.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      mockFallbackService.getFallbackBook.mockReturnValue({
        success: true,
        isbn: '9780140449136',
        book: mockTransformedBookData,
        source: 'api',
      });

      const result = await isbnService.lookupBook('9780140449136');

      expect(result.success).toBe(true);
      expect(result.source).toBe('api'); // This is correct - fallback returns with api source
      expect(result.error).toContain('API unavailable, using fallback data');
    });

    it('should handle complete failure when no fallback available', async () => {
      mockCircuitBreaker.execute.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      mockFallbackService.getFallbackBook.mockReturnValue(null);

      const result = await isbnService.lookupBook('9780140449136');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.source).toBe('api');
    });

    it('should handle unexpected errors', async () => {
      mockCircuitBreaker.execute.mockRejectedValue(new Error('Unexpected error'));
      mockFallbackService.getFallbackBook.mockReturnValue(null); // Ensure fallback also fails

      const result = await isbnService.lookupBook('9780140449136');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('lookupBooks', () => {
    beforeEach(() => {
      mockValidateIsbn.mockImplementation((isbn) => {
        if (isbn === 'invalid-isbn') {
          return {
            isValid: false,
            error: 'Invalid format',
          };
        }
        return {
          isValid: true,
          normalizedIsbn: isbn,
        };
      });
    });

    it('should handle batch lookup successfully', async () => {
      const isbns = ['9780140449136', '9780140449143'];
      
      mockOpenLibraryClient.fetchBooksByIsbns.mockResolvedValue({
        '9780140449136': {
          success: true,
          book: { ...mockOpenLibraryBook, title: 'Book 1' },
        },
        '9780140449143': {
          success: true,
          book: { ...mockOpenLibraryBook, title: 'Book 2', isbn_13: ['9780140449143'] },
        },
      });

      const result = await isbnService.lookupBooks(isbns);

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.apiCalls).toBe(1);
    });

    it('should handle mix of valid and invalid ISBNs', async () => {
      const isbns = ['9780140449136', 'invalid-isbn'];
      
      mockValidateIsbn
        .mockReturnValueOnce({
          isValid: true,
          normalizedIsbn: '9780140449136',
        })
        .mockReturnValueOnce({
          isValid: false,
          error: 'Invalid format',
        });

      mockOpenLibraryClient.fetchBooksByIsbns.mockResolvedValue({
        '9780140449136': {
          success: true,
          book: { ...mockOpenLibraryBook, title: 'Book 1' },
        },
      });

      const result = await isbnService.lookupBooks(isbns);

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.errors).toContain('Invalid ISBN invalid-isbn: Invalid format');
    });

    it('should use cached results when available', async () => {
      const isbns = ['9780140449136'];

      // First call to populate cache
      mockOpenLibraryClient.fetchBooksByIsbns.mockResolvedValue({
        '9780140449136': {
          success: true,
          book: { title: 'Book 1' },
        },
      });

      await isbnService.lookupBooks(isbns);

      // Second call should use cache
      const result = await isbnService.lookupBooks(isbns);

      expect(result.summary.cached).toBe(1);
      expect(result.summary.apiCalls).toBe(0);
    });

    it('should handle API batch failure', async () => {
      const isbns = ['9780140449136'];
      
      mockOpenLibraryClient.fetchBooksByIsbns.mockRejectedValue(new Error('API Error'));

      const result = await isbnService.lookupBooks(isbns);

      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(1);
      expect(result.errors).toContain('Batch API request failed');
    });
  });

  describe('searchByTitle', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should search books by title successfully', async () => {
      const searchResults = {
        success: true,
        books: [
          {
            title: 'The Odyssey',
            author_name: ['Homer'],
            isbn: ['9780140449136'],
            publish_year: [1997],
            cover_i: 123456,
          },
        ],
      };

      mockOpenLibraryClient.searchBooksByTitle.mockResolvedValue(searchResults);

      const result = await isbnService.searchByTitle('Odyssey');

      expect(result.success).toBe(true);
      expect(result.books).toHaveLength(1);
      expect(result.books![0]).toEqual({
        title: 'The Odyssey',
        authors: ['Homer'],
        isbns: ['9780140449136'],
        publishYear: 1997,
        coverUrl: 'https://covers.openlibrary.org/b/id/123456-M.jpg',
      });
    });

    it('should handle search failure', async () => {
      mockOpenLibraryClient.searchBooksByTitle.mockResolvedValue({
        success: false,
        error: 'Search failed',
      });

      const result = await isbnService.searchByTitle('NonexistentBook');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
    });

    it('should handle search with limit', async () => {
      mockOpenLibraryClient.searchBooksByTitle.mockResolvedValue({
        success: true,
        books: [],
      });

      await isbnService.searchByTitle('Test', 5);

      expect(mockOpenLibraryClient.searchBooksByTitle).toHaveBeenCalledWith('Test', 5);
    });

    it('should handle unexpected search errors', async () => {
      mockOpenLibraryClient.searchBooksByTitle.mockRejectedValue(new Error('Network error'));

      const result = await isbnService.searchByTitle('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error during title search');
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });
    });

    it('should provide cache statistics', () => {
      const stats = isbnService.getCacheStats();

      expect(stats).toEqual({
        size: 0,
        maxSize: 1000,
        oldestEntry: undefined,
        newestEntry: undefined,
      });
    });

    it('should clear cache', () => {
      isbnService.clearCache();
      
      const stats = isbnService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should respect cache expiration', async () => {
      const serviceWithShortCache = new IsbnService({
        cacheExpiration: 100, // 100ms
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: mockOpenLibraryBook,
      });

      // First call
      await serviceWithShortCache.lookupBook('9780140449136');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call should hit API again
      await serviceWithShortCache.lookupBook('9780140449136');

      expect(mockCircuitBreaker.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should check service health', async () => {
      const healthResult = {
        available: true,
        responseTime: 150,
      };

      mockOpenLibraryClient.healthCheck.mockResolvedValue(healthResult);

      const result = await isbnService.checkServiceHealth();

      expect(result.available).toBe(true);
      expect(result.responseTime).toBe(150);
      expect(result.cacheStats).toBeDefined();
    });

    it('should handle health check failure', async () => {
      mockOpenLibraryClient.healthCheck.mockResolvedValue({
        available: false,
        error: 'Service unavailable',
      });

      const result = await isbnService.checkServiceHealth();

      expect(result.available).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });
  });

  describe('Resilience Features', () => {
    it('should get resilience statistics', () => {
      mockCircuitBreaker.getStats.mockReturnValue({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        successCount: 5,
      });

      mockFallbackService.getStats.mockReturnValue({
        staticDataCount: 5,
        availableIsbns: ['9780140449136', '9780743273565'],
      });

      const stats = isbnService.getResilienceStats();

      expect(stats.circuitBreaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.fallback.staticDataCount).toBe(5);
      expect(stats.cache).toBeDefined();
      expect(stats.config.enableCache).toBe(true);
    });

    it('should reset all resilience mechanisms', () => {
      isbnService.resetResilience();

      expect(mockCircuitBreaker.reset).toHaveBeenCalled();
      expect(mockFallbackService.clearStaticData).toHaveBeenCalled();
    });

    it('should add fallback book data', () => {
      mockFallbackService.addStaticBookData.mockReturnValue(true);

      const result = isbnService.addFallbackBook('9780140449136', 'The Odyssey');

      expect(result).toBe(true);
      expect(mockFallbackService.addStaticBookData).toHaveBeenCalledWith(
        '9780140449136',
        {
          title: 'The Odyssey',
          source: 'manual',
          confidence: 'medium',
        }
      );
    });
  });

  describe('Configuration Scenarios', () => {
    it('should work with caching disabled', async () => {
      const serviceWithoutCache = new IsbnService({ enableCache: false });

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: { title: 'Test Book', isbnCode: '9780140449136', authors: [], categories: [] },
      });

      // Two identical calls should both hit the API
      await serviceWithoutCache.lookupBook('9780140449136');
      await serviceWithoutCache.lookupBook('9780140449136');

      expect(mockCircuitBreaker.execute).toHaveBeenCalledTimes(2);
    });

    it('should work with circuit breaker disabled', async () => {
      // Create a new service with circuit breaker disabled but retry enabled
      const serviceWithoutCircuitBreaker = new IsbnService({ 
        enableCircuitBreaker: false,
        enableRetry: true,
        openLibraryClient: mockOpenLibraryClient,
      });
      
      // Configure retry policy mock to execute the operation
      mockRetryPolicy.execute.mockImplementation(async (operation) => {
        const result = await operation();
        return { success: true, result, attempts: 1, totalTime: 100 };
      });

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockOpenLibraryClient.fetchBookByIsbn.mockResolvedValue({
        success: true,
        book: mockOpenLibraryBook,
      });

      await serviceWithoutCircuitBreaker.lookupBook('9780140449136');

      expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
      expect(mockOpenLibraryClient.fetchBookByIsbn).toHaveBeenCalled();
    });

    it('should work with retry disabled', async () => {
      const serviceWithoutRetry = new IsbnService({ enableRetry: false });

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: { title: 'Test Book' },
      });

      await serviceWithoutRetry.lookupBook('9780140449136');

      expect(mockRetryPolicy.execute).not.toHaveBeenCalled();
    });

    it('should work with fallback disabled', async () => {
      const serviceWithoutFallback = new IsbnService({ enableFallback: false });

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await serviceWithoutFallback.lookupBook('9780140449136');

      expect(mockFallbackService.getFallbackBook).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined responses gracefully', async () => {
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: null,
      });

      const result = await isbnService.lookupBook('9780140449136');

      expect(result.success).toBe(false);
    });

    it('should handle very large batch requests', async () => {
      const largeIsbnList = Array.from({ length: 100 }, (_, i) => `978${i.toString().padStart(10, '0')}`);
      
      mockValidateIsbn.mockImplementation((isbn) => ({
        isValid: true,
        normalizedIsbn: isbn,
      }));

      mockOpenLibraryClient.fetchBooksByIsbns.mockResolvedValue({});

      const result = await isbnService.lookupBooks(largeIsbnList);

      expect(result.summary.total).toBe(100);
      expect(mockOpenLibraryClient.fetchBooksByIsbns).toHaveBeenCalledWith(largeIsbnList);
    });

    it('should handle cache eviction when max size reached', async () => {
      const serviceWithSmallCache = new IsbnService({ maxCacheSize: 2 });

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockCircuitBreaker.execute.mockResolvedValue({
        success: true,
        book: { title: 'Test Book' },
      });

      // Add 3 items to cache (should trigger eviction)
      await serviceWithSmallCache.lookupBook('9780140449136');
      await serviceWithSmallCache.lookupBook('9780140449137');
      await serviceWithSmallCache.lookupBook('9780140449138');

      const stats = serviceWithSmallCache.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });
  });
});