// ================================================================
// tests/handlers/router.test.ts
// ================================================================

// Mock dependencies before imports
jest.mock('../../src/controllers/BookController');
jest.mock('../../src/controllers/AuthorController');
jest.mock('../../src/controllers/CategoryController');
jest.mock('../../src/controllers/IsbnController');
jest.mock('../../src/middleware/requestLogger');
jest.mock('../../src/middleware/cors');
jest.mock('../../src/middleware/errorHandler');

import { APIGatewayProxyEvent } from 'aws-lambda';
import { routeRequest } from '../../src/handlers/router';
import { bookController } from '../../src/controllers/BookController';
import { authorController } from '../../src/controllers/AuthorController';
import { categoryController } from '../../src/controllers/CategoryController';
import { isbnController } from '../../src/controllers/IsbnController';
import { corsHandler } from '../../src/middleware/cors';
import { errorHandler } from '../../src/middleware/errorHandler';

describe('Router Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'GET',
      resource: '/books',
      pathParameters: null,
      queryStringParameters: null,
      headers: {},
      body: null,
      requestContext: {
        requestId: 'test-request-id',
      } as any,
    };
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests', async () => {
      const mockCorsResponse = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };

      (corsHandler as jest.Mock).mockReturnValue(mockCorsResponse);

      mockEvent.httpMethod = 'OPTIONS';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(corsHandler).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockCorsResponse);
    });
  });

  describe('Book routes', () => {
    it('should route GET /books to bookController.listBooks', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: [] }),
      };

      (bookController.listBooks as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(bookController.listBooks).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });

    it('should route POST /books to bookController.createBook', async () => {
      const mockResponse = {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { id: 1 } }),
      };

      (bookController.createBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'POST';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(bookController.createBook).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });

    it('should route GET /books/{id} to bookController.getBook', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { id: 1 } }),
      };

      (bookController.getBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/books/{id}';
      mockEvent.httpMethod = 'GET';
      mockEvent.pathParameters = { id: '1' };

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(bookController.getBook).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Author routes', () => {
    it('should route GET /authors to authorController.listAuthors', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: [] }),
      };

      (authorController.listAuthors as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/authors';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(authorController.listAuthors).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });

    it('should route GET /authors/{id}/books to authorController.getAuthorBooks', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { author: {}, books: [] } }),
      };

      (authorController.getAuthorBooks as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/authors/{id}/books';
      mockEvent.httpMethod = 'GET';
      mockEvent.pathParameters = { id: '1' };

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(authorController.getAuthorBooks).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Category routes', () => {
    it('should route GET /categories to categoryController.listCategories', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: [] }),
      };

      (categoryController.listCategories as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/categories';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(categoryController.listCategories).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('ISBN routes', () => {
    it('should route GET /isbn/lookup to isbnController.lookupBook', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { book: {} } }),
      };

      (isbnController.lookupBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.resource = '/isbn/lookup';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(isbnController.lookupBook).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Health check', () => {
    it('should handle health check requests', async () => {
      mockEvent.resource = '/health';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('API is healthy');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Route not found', () => {
    it('should return 404 for unknown routes', async () => {
      mockEvent.resource = '/unknown';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Route not found');
      expect(body.resource).toBe('/unknown');
      expect(body.method).toBe('GET');
    });
  });

  describe('Error handling', () => {
    it('should handle controller errors', async () => {
      const mockError = new Error('Controller error');
      const mockErrorResponse = {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Internal server error' }),
      };

      (bookController.listBooks as jest.Mock).mockRejectedValue(mockError);
      (errorHandler as jest.Mock).mockReturnValue(mockErrorResponse);

      mockEvent.resource = '/books';
      mockEvent.httpMethod = 'GET';

      const result = await routeRequest(mockEvent as APIGatewayProxyEvent);

      expect(errorHandler).toHaveBeenCalledWith(mockError);
      expect(result).toEqual(mockErrorResponse);
    });
  });
});