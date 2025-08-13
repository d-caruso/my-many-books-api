// ================================================================
// tests/handlers/index.test.ts
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import { healthCheck } from '../../src/handlers/health';
import * as bookHandlers from '../../src/handlers/books';
import * as authorHandlers from '../../src/handlers/authors';
import * as categoryHandlers from '../../src/handlers/categories';
import * as isbnHandlers from '../../src/handlers/isbn';

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('../../src/middleware/requestLogger');
jest.mock('../../src/middleware/cors', () => ({
  corsHandler: jest.fn().mockReturnValue({
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: '',
  })
}));
jest.mock('../../src/middleware/errorHandler', () => ({
  errorHandler: jest.fn().mockReturnValue({
    statusCode: 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Internal server error' })
  })
}));

// Mock controllers with proper return values
jest.mock('../../src/controllers/BookController', () => ({
  bookController: {
    listBooks: jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} }),
    createBook: jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} }),
    getBook: jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} }),
    updateBook: jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} }),
    deleteBook: jest.fn().mockResolvedValue({ statusCode: 204, body: '{}', headers: {} }),
  }
}));

jest.mock('../../src/controllers/AuthorController', () => ({
  authorController: {
    listAuthors: jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} }),
    createAuthor: jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} }),
  }
}));

jest.mock('../../src/controllers/CategoryController', () => ({
  categoryController: {
    listCategories: jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} }),
    createCategory: jest.fn().mockResolvedValue({ statusCode: 201, body: '{}', headers: {} }),
  }
}));

jest.mock('../../src/controllers/IsbnController', () => ({
  isbnController: {
    lookupBook: jest.fn().mockResolvedValue({ statusCode: 200, body: '{}', headers: {} }),
  }
}));

describe('Lambda Handlers', () => {
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
  });

  describe('Health Check Handler', () => {
    it('should return health status', async () => {
      const result = await healthCheck(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.timestamp).toBeDefined();
    });
  });

  describe('Book Handlers', () => {
    it('should handle book listing', async () => {
      const result = await bookHandlers.listBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBeDefined();
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });

    it('should handle book creation', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ title: 'Test Book' });

      const result = await bookHandlers.createBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBeDefined();
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });
  });

  describe('Author Handlers', () => {
    it('should handle author listing', async () => {
      const result = await authorHandlers.listAuthors(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBeDefined();
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });

    it('should handle author creation', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ name: 'Test Author' });

      const result = await authorHandlers.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBeDefined();
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });
  });

  describe('Category Handlers', () => {
    it('should handle category listing', async () => {
      const result = await categoryHandlers.listCategories(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBeDefined();
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });
  });

  describe('ISBN Handlers', () => {
    it('should handle book lookup', async () => {
      mockEvent.queryStringParameters = { isbn: '9780123456789' };

      const result = await isbnHandlers.lookupBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBeDefined();
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        })
      );
    });
  });

});