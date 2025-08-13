// ================================================================
// tests/handlers/index.test.ts
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../src/handlers/index';
import { DatabaseUtils } from '../../src/utils/database';

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('../../src/controllers/BookController');
jest.mock('../../src/controllers/AuthorController');
jest.mock('../../src/controllers/CategoryController');
jest.mock('../../src/controllers/IsbnController');

describe('Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'GET',
      resource: '/health',
      pathParameters: null,
      queryStringParameters: null,
      headers: {},
      body: null,
      requestContext: {
        requestId: 'test-request-id',
      } as any,
    };

    (DatabaseUtils.initialize as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Database initialization', () => {
    it('should initialize database on first request', async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(DatabaseUtils.initialize).toHaveBeenCalledTimes(1);
      expect(result.statusCode).toBe(200);
    });

    it('should not reinitialize database on subsequent requests', async () => {
      // First request
      await handler(mockEvent as APIGatewayProxyEvent);
      
      // Second request
      await handler(mockEvent as APIGatewayProxyEvent);

      expect(DatabaseUtils.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests', async () => {
      mockEvent.httpMethod = 'OPTIONS';
      mockEvent.resource = '/books';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
      expect(result.body).toBe('');
    });

    it('should include CORS headers in all responses', async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });
  });

  describe('Health check route', () => {
    it('should return health status', async () => {
      mockEvent.resource = '/health';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('API is healthy');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Route matching', () => {
    it('should route book requests to BookController', async () => {
      const { bookController } = require('../../src/controllers/BookController');
      bookController.listBooks = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: {},
      });

      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(bookController.listBooks).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });

    it('should route author requests to AuthorController', async () => {
      const { authorController } = require('../../src/controllers/AuthorController');
      authorController.listAuthors = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: {},
      });

      mockEvent.resource = '/authors';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(authorController.listAuthors).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });

    it('should route category requests to CategoryController', async () => {
      const { categoryController } = require('../../src/controllers/CategoryController');
      categoryController.listCategories = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: {},
      });

      mockEvent.resource = '/categories';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(categoryController.listCategories).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });

    it('should route ISBN requests to IsbnController', async () => {
      const { isbnController } = require('../../src/controllers/IsbnController');
      isbnController.lookupBook = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: {},
      });

      mockEvent.resource = '/isbn/lookup';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(isbnController.lookupBook).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });

    it('should return 404 for unknown routes', async () => {
      mockEvent.resource = '/unknown';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Route not found');
      expect(body.resource).toBe('/unknown');
      expect(body.method).toBe('GET');
    });

    it('should return 404 for unsupported HTTP methods on valid routes', async () => {
      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'PATCH'; // Unsupported method

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Route not found');
    });
  });

  describe('Specific route handling', () => {
    beforeEach(() => {
      // Mock all controller methods to avoid actual calls
      const { bookController } = require('../../src/controllers/BookController');
      const { authorController } = require('../../src/controllers/AuthorController');
      const { categoryController } = require('../../src/controllers/CategoryController');
      const { isbnController } = require('../../src/controllers/IsbnController');

      // Book controller methods
      bookController.listBooks = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      bookController.createBook = jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} });
      bookController.getBook = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      bookController.updateBook = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      bookController.deleteBook = jest.fn().mockResolvedValue({ statusCode: 204, body: '{}', headers: {} });
      bookController.searchBooksByIsbn = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      bookController.importBookFromIsbn = jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} });

      // Author controller methods
      authorController.listAuthors = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      authorController.createAuthor = jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} });
      authorController.getAuthor = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      authorController.updateAuthor = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      authorController.deleteAuthor = jest.fn().mockResolvedValue({ statusCode: 204, body: '{}', headers: {} });
      authorController.getAuthorBooks = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });

      // Category controller methods
      categoryController.listCategories = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      categoryController.createCategory = jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} });
      categoryController.getCategory = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      categoryController.updateCategory = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      categoryController.deleteCategory = jest.fn().mockResolvedValue({ statusCode: 204, body: '{}', headers: {} });
      categoryController.getCategoryBooks = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });

      // ISBN controller methods
      isbnController.lookupBook = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.batchLookupBooks = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.searchByTitle = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.validateIsbn = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.formatIsbn = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.getServiceHealth = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.getResilienceStats = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.clearCache = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.getCacheStats = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.resetResilience = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} });
      isbnController.addFallbackBook = jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} });
    });

    it('should handle book routes correctly', async () => {
      const { bookController } = require('../../src/controllers/BookController');

      // Test GET /books
      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'GET';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(bookController.listBooks).toHaveBeenCalled();

      // Test POST /books
      mockEvent.httpMethod = 'POST';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(bookController.createBook).toHaveBeenCalled();

      // Test GET /books/{id}
      mockEvent.resource = '/books/{id}';
      mockEvent.httpMethod = 'GET';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(bookController.getBook).toHaveBeenCalled();

      // Test PUT /books/{id}
      mockEvent.httpMethod = 'PUT';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(bookController.updateBook).toHaveBeenCalled();

      // Test DELETE /books/{id}
      mockEvent.httpMethod = 'DELETE';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(bookController.deleteBook).toHaveBeenCalled();
    });

    it('should handle ISBN routes correctly', async () => {
      const { isbnController } = require('../../src/controllers/IsbnController');

      // Test GET /isbn/lookup
      mockEvent.resource = '/isbn/lookup';
      mockEvent.httpMethod = 'GET';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(isbnController.lookupBook).toHaveBeenCalled();

      // Test POST /isbn/lookup
      mockEvent.httpMethod = 'POST';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(isbnController.batchLookupBooks).toHaveBeenCalled();

      // Test GET /isbn/health
      mockEvent.resource = '/isbn/health';
      mockEvent.httpMethod = 'GET';
      await handler(mockEvent as APIGatewayProxyEvent);
      expect(isbnController.getServiceHealth).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle controller errors gracefully', async () => {
      const { bookController } = require('../../src/controllers/BookController');
      bookController.listBooks = jest.fn().mockRejectedValue(new Error('Controller error'));

      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'GET';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Controller error');
    });

    it('should handle database initialization errors', async () => {
      (DatabaseUtils.initialize as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Internal server error');
    });
  });
});