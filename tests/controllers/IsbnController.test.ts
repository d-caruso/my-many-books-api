// ================================================================
// tests/controllers/IsbnController.test.ts
// ================================================================

// Mock dependencies - must be before imports
jest.mock('../../src/utils/isbn', () => ({
  validateIsbn: jest.fn(() => ({
    isValid: true,
    normalizedIsbn: '9780140449136',
  })),
}));
jest.mock('../../src/services/isbnService');

import { APIGatewayProxyEvent } from 'aws-lambda';
import { IsbnController } from '../../src/controllers/IsbnController';
import { isbnService } from '../../src/services/isbnService';
import { validateIsbn } from '../../src/utils/isbn';

describe('IsbnController', () => {
  let isbnController: IsbnController;
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    isbnController = new IsbnController();
    jest.clearAllMocks();

    mockEvent = {
      httpMethod: 'GET',
      resource: '/isbn',
      pathParameters: null,
      queryStringParameters: null,
      headers: {},
      body: null,
      requestContext: {
        requestId: 'test-request-id',
      } as any,
    };

    // Default mock for validateIsbn
    (validateIsbn as jest.Mock).mockReturnValue({
      isValid: true,
      normalizedIsbn: '9780140449136',
    });
  });

  describe('lookupBook', () => {
    it('should lookup book successfully via path parameter', async () => {
      const mockResult = {
        success: true,
        isbn: '9780140449136',
        book: { title: 'Test Book' },
        source: 'api',
        responseTime: 100,
      };

      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockResult);

      mockEvent.pathParameters = { isbn: '9780140449136' };

      const result = await isbnController.lookupBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        isbn: mockResult.isbn,
        book: mockResult.book,
        source: mockResult.source,
        responseTime: mockResult.responseTime,
      });
    });

    it('should lookup book successfully via query parameter', async () => {
      const mockResult = {
        success: true,
        isbn: '9780140449136',
        book: { title: 'Test Book' },
        source: 'api',
        responseTime: 100,
      };

      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockResult);

      mockEvent.queryStringParameters = { isbn: '9780140449136' };

      const result = await isbnController.lookupBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 when ISBN parameter is missing', async () => {
      const result = await isbnController.lookupBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('ISBN parameter is required');
    });

    it('should return 400 for invalid ISBN', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });

      mockEvent.queryStringParameters = { isbn: 'invalid-isbn' };

      const result = await isbnController.lookupBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 404 when book is not found', async () => {
      const mockResult = {
        success: false,
        isbn: '9780140449136',
        error: 'Book not found',
        source: 'api',
        responseTime: 100,
      };

      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockResult);

      mockEvent.queryStringParameters = { isbn: '9780140449136' };

      const result = await isbnController.lookupBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Book not found');
    });
  });

  describe('batchLookupBooks', () => {
    it('should perform batch lookup successfully', async () => {
      const mockResult = {
        results: {
          '9780140449136': {
            success: true,
            book: { title: 'Book 1' },
            source: 'api',
            responseTime: 100,
          },
          '9780140449143': {
            success: true,
            book: { title: 'Book 2' },
            source: 'cache',
            responseTime: 5,
          },
        },
        summary: {
          total: 2,
          successful: 2,
          failed: 0,
          cached: 1,
          apiCalls: 1,
        },
        errors: [],
      };

      (isbnService.lookupBooks as jest.Mock).mockResolvedValue(mockResult);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        isbns: ['9780140449136', '9780140449143'],
      });

      const result = await isbnController.batchLookupBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.books).toHaveLength(2);
      expect(body.data.summary).toEqual(mockResult.summary);
    });

    it('should return 400 for missing request body', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = null;

      const result = await isbnController.batchLookupBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        isbns: [], // Empty array not allowed
      });

      const result = await isbnController.batchLookupBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('searchByTitle', () => {
    it('should search by title successfully', async () => {
      const mockResult = {
        success: true,
        books: [
          {
            title: 'Test Book',
            authors: ['Test Author'],
            isbns: ['9780140449136'],
            publishYear: 2020,
          },
        ],
      };

      (isbnService.searchByTitle as jest.Mock).mockResolvedValue(mockResult);

      mockEvent.queryStringParameters = {
        title: 'Test Book',
        limit: '5',
      };

      const result = await isbnController.searchByTitle(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Test Book');
      expect(body.data.books).toEqual(mockResult.books);
      expect(body.data.limit).toBe(5);
    });

    it('should return 400 when title parameter is missing', async () => {
      const result = await isbnController.searchByTitle(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Title parameter is required');
    });

    it('should use default limit when not provided', async () => {
      const mockResult = {
        success: true,
        books: [],
      };

      (isbnService.searchByTitle as jest.Mock).mockResolvedValue(mockResult);

      mockEvent.queryStringParameters = { title: 'Test' };

      const result = await isbnController.searchByTitle(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.limit).toBe(10); // Default limit
    });
  });

  describe('getServiceHealth', () => {
    it('should return healthy status', async () => {
      const mockHealthResult = {
        available: true,
        responseTime: 150,
        cacheStats: { size: 10, maxSize: 100 },
      };

      (isbnService.checkServiceHealth as jest.Mock).mockResolvedValue(mockHealthResult);

      const result = await isbnController.getServiceHealth(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.available).toBe(true);
      expect(body.data.responseTime).toBe(150);
    });

    it('should return unhealthy status', async () => {
      const mockHealthResult = {
        available: false,
        error: 'Service unavailable',
        cacheStats: { size: 10, maxSize: 100 },
      };

      (isbnService.checkServiceHealth as jest.Mock).mockResolvedValue(mockHealthResult);

      const result = await isbnController.getServiceHealth(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('unhealthy');
      expect(body.data.available).toBe(false);
      expect(body.data.error).toBe('Service unavailable');
    });
  });

  describe('getResilienceStats', () => {
    it('should return resilience statistics', async () => {
      const mockStats = {
        circuitBreaker: { state: 'CLOSED', failures: 0 },
        fallback: { hits: 5, misses: 10 },
        cache: { size: 50, maxSize: 100 },
        config: { enableCache: true, enableRetry: true },
      };

      (isbnService.getResilienceStats as jest.Mock).mockReturnValue(mockStats);

      const result = await isbnController.getResilienceStats(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.circuitBreaker).toEqual(mockStats.circuitBreaker);
      expect(body.data.config).toEqual(mockStats.config);
    });
  });

  describe('resetResilience', () => {
    it('should reset resilience mechanisms', async () => {
      (isbnService.resetResilience as jest.Mock).mockReturnValue(undefined);

      const result = await isbnController.resetResilience(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Resilience mechanisms reset successfully');
      expect(isbnService.resetResilience).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      (isbnService.clearCache as jest.Mock).mockReturnValue(undefined);

      const result = await isbnController.clearCache(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('ISBN service cache cleared successfully');
      expect(isbnService.clearCache).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        size: 50,
        maxSize: 100,
        hitRate: 0.85,
      };

      (isbnService.getCacheStats as jest.Mock).mockReturnValue(mockStats);

      const result = await isbnController.getCacheStats(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.size).toBe(50);
      expect(body.data.maxSize).toBe(100);
    });
  });

  describe('addFallbackBook', () => {
    it('should add fallback book successfully', async () => {
      (isbnService.addFallbackBook as jest.Mock).mockReturnValue(true);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        isbn: '9780140449136',
        title: 'Fallback Book',
      });

      const result = await isbnController.addFallbackBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Fallback book added successfully');
      expect(body.data).toEqual({
        isbn: '9780140449136',
        title: 'Fallback Book',
      });
    });

    it('should return 400 when fallback addition fails', async () => {
      (isbnService.addFallbackBook as jest.Mock).mockReturnValue(false);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        isbn: '9780140449136',
        title: 'Fallback Book',
      });

      const result = await isbnController.addFallbackBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to add fallback book');
    });
  });

  describe('validateIsbn', () => {
    it('should validate ISBN successfully', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockEvent.queryStringParameters = { isbn: '978-0-14-044913-6' };

      const result = await isbnController.validateIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.isValid).toBe(true);
      expect(body.data.normalizedIsbn).toBe('9780140449136');
      expect(body.data.details.format).toBe('ISBN-13');
    });

    it('should handle invalid ISBN', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });

      mockEvent.queryStringParameters = { isbn: 'invalid' };

      const result = await isbnController.validateIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.isValid).toBe(false);
      expect(body.data.error).toBe('Invalid format');
    });
  });

  describe('formatIsbn', () => {
    it('should format ISBN as hyphenated', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockEvent.queryStringParameters = {
        isbn: '9780140449136',
        format: 'hyphenated',
      };

      const result = await isbnController.formatIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.format).toBe('hyphenated');
      expect(body.data.formattedIsbn).toMatch(/\d{3}-\d-\d{2}-\d{6}-\d/);
    });

    it('should convert ISBN-13 to ISBN-10', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockEvent.queryStringParameters = {
        isbn: '9780140449136',
        format: 'isbn10',
      };

      const result = await isbnController.formatIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.format).toBe('isbn10');
      expect(body.data.formattedIsbn).toHaveLength(10);
    });

    it('should return 400 for invalid format', async () => {
      mockEvent.queryStringParameters = {
        isbn: '9780140449136',
        format: 'invalid',
      };

      const result = await isbnController.formatIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Format must be one of');
    });
  });
});