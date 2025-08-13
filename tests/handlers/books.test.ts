// ================================================================
// tests/handlers/books.test.ts
// ================================================================

// Mock dependencies before imports
jest.mock('../../src/controllers/BookController');
jest.mock('../../src/middleware/requestLogger');
jest.mock('../../src/middleware/cors');
jest.mock('../../src/middleware/errorHandler');

import { APIGatewayProxyEvent } from 'aws-lambda';
import { createBook, getBook, updateBook, deleteBook, listBooks, searchBooksByIsbn, importBookFromIsbn } from '../../src/handlers/books';
import { bookController } from '../../src/controllers/BookController';

describe('Books Handlers', () => {
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

  describe('createBook', () => {
    it('should handle OPTIONS request', async () => {
      mockEvent.httpMethod = 'OPTIONS';
      
      const result = await createBook(mockEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    });

    it('should call bookController.createBook', async () => {
      const mockResponse = {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { id: 1, title: 'Test Book' } }),
      };

      (bookController.createBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ title: 'Test Book' });

      const result = await createBook(mockEvent as APIGatewayProxyEvent);

      expect(bookController.createBook).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(201);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
      });
    });

    it('should handle errors gracefully', async () => {
      (bookController.createBook as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ title: 'Test Book' });

      const result = await createBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('getBook', () => {
    it('should call bookController.getBook', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { id: 1, title: 'Test Book' } }),
      };

      (bookController.getBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.pathParameters = { id: '1' };

      const result = await getBook(mockEvent as APIGatewayProxyEvent);

      expect(bookController.getBook).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
      });
    });
  });

  describe('updateBook', () => {
    it('should call bookController.updateBook', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { id: 1, title: 'Updated Book' } }),
      };

      (bookController.updateBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: '1' };
      mockEvent.body = JSON.stringify({ title: 'Updated Book' });

      const result = await updateBook(mockEvent as APIGatewayProxyEvent);

      expect(bookController.updateBook).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('deleteBook', () => {
    it('should call bookController.deleteBook', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Book deleted successfully' }),
      };

      (bookController.deleteBook as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: '1' };

      const result = await deleteBook(mockEvent as APIGatewayProxyEvent);

      expect(bookController.deleteBook).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(204);
    });
  });

  describe('listBooks', () => {
    it('should call bookController.listBooks', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: [{ id: 1, title: 'Book 1' }] }),
      };

      (bookController.listBooks as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.queryStringParameters = { page: '1', limit: '10' };

      const result = await listBooks(mockEvent as APIGatewayProxyEvent);

      expect(bookController.listBooks).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('searchBooksByIsbn', () => {
    it('should call bookController.searchBooksByIsbn', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { source: 'local', book: { id: 1 } } }),
      };

      (bookController.searchBooksByIsbn as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.queryStringParameters = { isbn: '9780140449136' };

      const result = await searchBooksByIsbn(mockEvent as APIGatewayProxyEvent);

      expect(bookController.searchBooksByIsbn).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('importBookFromIsbn', () => {
    it('should call bookController.importBookFromIsbn', async () => {
      const mockResponse = {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { book: { id: 1 }, source: 'api' } }),
      };

      (bookController.importBookFromIsbn as jest.Mock).mockResolvedValue(mockResponse);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ isbn: '9780140449136' });

      const result = await importBookFromIsbn(mockEvent as APIGatewayProxyEvent);

      expect(bookController.importBookFromIsbn).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(201);
    });
  });
});