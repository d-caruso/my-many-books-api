// ================================================================
// tests/controllers/BookController.test.ts
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import { BookController } from '../../src/controllers/BookController';
import { Book, Author, Category } from '../../src/models';
import { isbnService } from '../../src/services/isbnService';

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/services/isbnService');

describe('BookController', () => {
  let bookController: BookController;
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    bookController = new BookController();
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
    const validBookData = {
      title: 'Test Book',
      subtitle: 'A Test Subtitle',
      isbn: '9780140449136',
      description: 'A test book description',
      publishedDate: '2023-01-01T00:00:00.000Z',
      pageCount: 300,
      language: 'en',
      publisher: 'Test Publisher',
    };

    it('should create a book successfully', async () => {
      const mockBook = { id: 1, ...validBookData };
      const mockCreatedBook = { ...mockBook, Authors: [], Categories: [] };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (Book.create as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockCreatedBook);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(validBookData);

      const result = await bookController.createBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Book created successfully');
      expect(body.data).toEqual(mockCreatedBook);
    });

    it('should return 400 for missing request body', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = null;

      const result = await bookController.createBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = { title: '' }; // Missing required title

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(invalidData);

      const result = await bookController.createBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate ISBN', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue({ id: 2, isbnCode: '9780140449136' });

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(validBookData);

      const result = await bookController.createBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Book with this ISBN already exists');
    });
  });

  describe('getBook', () => {
    it('should get a book successfully', async () => {
      const mockBook = {
        id: 1,
        title: 'Test Book',
        Authors: [],
        Categories: [],
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      mockEvent.pathParameters = { id: '1' };

      const result = await bookController.getBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockBook);
    });

    it('should return 400 for invalid book ID', async () => {
      mockEvent.pathParameters = { id: 'invalid' };

      const result = await bookController.getBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Valid book ID is required');
    });

    it('should return 404 for non-existent book', async () => {
      (Book.findByPk as jest.Mock).mockResolvedValue(null);

      mockEvent.pathParameters = { id: '999' };

      const result = await bookController.getBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Book not found');
    });
  });

  describe('updateBook', () => {
    const updateData = {
      title: 'Updated Title',
      pageCount: 400,
    };

    it('should update a book successfully', async () => {
      const mockBook = {
        id: 1,
        title: 'Original Title',
        isbnCode: '9780140449136',
        update: jest.fn(),
        removeAuthors: jest.fn(),
        addAuthors: jest.fn(),
        removeCategories: jest.fn(),
        addCategories: jest.fn(),
        authors: [],
        categories: [],
      };

      const mockUpdatedBook = {
        ...mockBook,
        title: 'Updated Title',
        pageCount: 400,
        Authors: [],
        Categories: [],
      };

      (Book.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockBook)
        .mockResolvedValueOnce(mockUpdatedBook);

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: '1' };
      mockEvent.body = JSON.stringify(updateData);

      const result = await bookController.updateBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Book updated successfully');
      expect(mockBook.update).toHaveBeenCalled();
    });

    it('should return 404 for non-existent book', async () => {
      (Book.findByPk as jest.Mock).mockResolvedValue(null);

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: '999' };
      mockEvent.body = JSON.stringify(updateData);

      const result = await bookController.updateBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Book not found');
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully', async () => {
      const mockBook = {
        id: 1,
        destroy: jest.fn(),
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: '1' };

      const result = await bookController.deleteBook(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(204);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Book deleted successfully');
      expect(mockBook.destroy).toHaveBeenCalled();
    });
  });

  describe('listBooks', () => {
    it('should list books with pagination', async () => {
      const mockBooks = [
        { id: 1, title: 'Book 1', Authors: [], Categories: [] },
        { id: 2, title: 'Book 2', Authors: [], Categories: [] },
      ];

      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockBooks,
      });

      mockEvent.queryStringParameters = { page: '1', limit: '10' };

      const result = await bookController.listBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockBooks);
      expect(body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should handle search filters', async () => {
      const filters = { title: 'Test' };
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: [{ id: 1, title: 'Test Book', Authors: [], Categories: [] }],
      });

      mockEvent.queryStringParameters = {
        filters: JSON.stringify(filters),
      };

      const result = await bookController.listBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });

  describe('searchBooksByIsbn', () => {
    it('should find book in local database', async () => {
      const mockBook = {
        id: 1,
        isbn: '9780140449136',
        title: 'Local Book',
        Authors: [],
        Categories: [],
      };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);

      mockEvent.queryStringParameters = { isbn: '9780140449136' };

      const result = await bookController.searchBooksByIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.source).toBe('local');
      expect(body.data.book).toEqual(mockBook);
    });

    it('should search external service when not found locally', async () => {
      const mockExternalResult = {
        success: true,
        book: { title: 'External Book' },
        source: 'api',
      };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockExternalResult);

      mockEvent.queryStringParameters = { isbn: '9780140449136' };

      const result = await bookController.searchBooksByIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.source).toBe('api');
      expect(body.data.book).toEqual(mockExternalResult.book);
    });
  });

  describe('importBookFromIsbn', () => {
    it('should import book successfully', async () => {
      const mockIsbnResult = {
        success: true,
        book: {
          title: 'Imported Book',
          authors: [{ name: 'Test', surname: 'Author' }],
          categories: [{ name: 'Fiction' }],
          isbnCode: '9780140449136',
        },
        source: 'api',
        responseTime: 100,
      };

      const mockCreatedBook = { id: 1, title: 'Imported Book' };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockIsbnResult);
      (Book.create as jest.Mock).mockResolvedValue({
        id: 1,
        addAuthors: jest.fn(),
        addCategories: jest.fn(),
      });
      (Author.findOrCreate as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (Category.findOrCreate as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockCreatedBook);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ isbn: '9780140449136' });

      const result = await bookController.importBookFromIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Book imported successfully');
    });

    it('should return 409 for existing ISBN', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue({ id: 1 });

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ isbn: '9780140449136' });

      const result = await bookController.importBookFromIsbn(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Book with this ISBN already exists');
    });
  });
});