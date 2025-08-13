// ================================================================
// tests/controllers/BookController.user-methods.test.ts
// Unit tests for BookController Express methods (user-scoped operations)
// ================================================================

import { Response } from 'express';
import { BookController } from '../../src/controllers/BookController';
import { AuthenticatedRequest } from '../../src/middleware/auth';
import { Book } from '../../src/models/Book';
import { BookAuthor } from '../../src/models/BookAuthor';
import { BookCategory } from '../../src/models/BookCategory';
import { validateIsbn, IsbnValidationResult } from '../../src/utils/isbn';
import { isbnService } from '../../src/services/isbnService';
import { IsbnLookupResult } from '../../src/types/bookData';

// Mock dependencies
jest.mock('../../src/models/Book');
jest.mock('../../src/models/Author');
jest.mock('../../src/models/Category');
jest.mock('../../src/models/BookAuthor');
jest.mock('../../src/models/BookCategory');
jest.mock('../../src/services/isbnService');

// Mock ISBN utils with proper default export
jest.mock('../../src/utils/isbn', () => ({
  validateIsbn: jest.fn().mockReturnValue({
    isValid: true,
    normalizedIsbn: '1234567890',
    format: 'ISBN-10'
  }),
  IsbnValidationResult: {},
}));

const mockBook = Book as jest.Mocked<typeof Book>;
const mockBookAuthor = BookAuthor as jest.Mocked<typeof BookAuthor>;
const mockBookCategory = BookCategory as jest.Mocked<typeof BookCategory>;
const mockValidateIsbn = validateIsbn as jest.MockedFunction<typeof validateIsbn>;
const mockIsbnService = isbnService as jest.Mocked<typeof isbnService>;

describe('BookController Express Methods', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      user: {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
      },
      body: {},
      query: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getUserBooks', () => {
    it('should return user books with pagination', async () => {
      const mockBooks = [
        {
          id: 1,
          title: 'Book 1',
          isbnCode: '1234567890',
          userId: 1,
          toJSON: jest.fn().mockReturnValue({ id: 1, title: 'Book 1' }),
        },
        {
          id: 2,
          title: 'Book 2',
          isbnCode: '0987654321',
          userId: 1,
          toJSON: jest.fn().mockReturnValue({ id: 2, title: 'Book 2' }),
        },
      ];

      req.query = { page: '1', limit: '10' };

      (mockBook.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockBooks,
      });

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(mockBook.findAndCountAll).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: expect.any(Array),
        limit: 10,
        offset: 0,
        order: [['title', 'ASC']],
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        books: [{ id: 1, title: 'Book 1' }, { id: 2, title: 'Book 2' }],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 10,
        },
      });
    });

    it('should filter books by status', async () => {
      req.query = { status: 'in progress' };
      (mockBook.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(mockBook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1, status: 'in progress' },
        })
      );
    });

    it('should filter books by search term', async () => {
      req.query = { search: 'Harry Potter' };
      (mockBook.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(mockBook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
            title: expect.objectContaining({
              [require('sequelize').Op.iLike]: '%Harry Potter%',
            }),
          }),
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      delete req.user;

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockBook.findAndCountAll.mockRejectedValue(error);

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Database error',
      });
    });
  });

  describe('getBookById', () => {
    it('should return book by ID for authenticated user', async () => {
      const mockBookData = {
        id: 1,
        title: 'Test Book',
        userId: 1,
        toJSON: jest.fn().mockReturnValue({ id: 1, title: 'Test Book' }),
      };

      req.params = { id: '1' };
      mockBook.findOne.mockResolvedValue(mockBookData as any);

      await BookController.getBookById(req as AuthenticatedRequest, res as Response);

      expect(mockBook.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        include: expect.any(Array),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: 1, title: 'Test Book' });
    });

    it('should return 400 for invalid book ID', async () => {
      req.params = { id: 'invalid' };

      await BookController.getBookById(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid book ID' });
    });

    it('should return 404 when book is not found', async () => {
      req.params = { id: '1' };
      mockBook.findOne.mockResolvedValue(null);

      await BookController.getBookById(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Book not found' });
    });

    it('should return 401 when user is not authenticated', async () => {
      delete req.user;

      await BookController.getBookById(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('createBookForUser', () => {
    it('should create book successfully', async () => {
      const mockCreatedBook = {
        id: 1,
        title: 'New Book',
        isbnCode: '1234567890',
        userId: 1,
        toJSON: jest.fn().mockReturnValue({ id: 1, title: 'New Book' }),
      };

      req.body = {
        title: 'New Book',
        isbnCode: '1234567890',
        authorIds: [1, 2],
        categoryIds: [1],
      };

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '1234567890',
        format: 'ISBN-10'
      } as IsbnValidationResult);
      mockBook.findOne.mockResolvedValue(null); // No existing book
      mockBook.create.mockResolvedValue(mockCreatedBook as any);
      mockBookAuthor.create.mockResolvedValue({} as any);
      mockBookCategory.create.mockResolvedValue({} as any);
      mockBook.findByPk.mockResolvedValue(mockCreatedBook as any);

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(mockValidateIsbn).toHaveBeenCalledWith('1234567890');
      expect(mockBook.create).toHaveBeenCalledWith({
        title: 'New Book',
        isbnCode: '1234567890',
        editionNumber: undefined,
        editionDate: undefined,
        status: undefined,
        notes: undefined,
        userId: 1,
      });
      expect(mockBookAuthor.create).toHaveBeenCalledTimes(2);
      expect(mockBookCategory.create).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when title is missing', async () => {
      req.body = { isbnCode: '1234567890' };

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    });

    it('should return 400 when ISBN is missing', async () => {
      req.body = { title: 'New Book' };

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ISBN code is required' });
    });

    it('should return 400 for invalid ISBN', async () => {
      req.body = {
        title: 'New Book',
        isbnCode: 'invalid-isbn',
      };

      mockValidateIsbn.mockReturnValue({
        isValid: false
      } as IsbnValidationResult);

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid ISBN format' });
    });

    it('should return 409 when book already exists for user', async () => {
      req.body = {
        title: 'New Book',
        isbnCode: '1234567890',
      };

      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '1234567890',
        format: 'ISBN-10'
      } as IsbnValidationResult);
      mockBook.findOne.mockResolvedValue({ id: 1 } as any); // Existing book

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Book with this ISBN already exists in your library' 
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      delete req.user;

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('updateBookForUser', () => {
    it('should update book successfully', async () => {
      const mockBook = {
        id: 1,
        userId: 1,
        update: jest.fn().mockResolvedValue(true),
      };

      const mockUpdatedBook = {
        id: 1,
        title: 'Updated Book',
        toJSON: jest.fn().mockReturnValue({ id: 1, title: 'Updated Book' }),
      };

      req.params = { id: '1' };
      req.body = {
        title: 'Updated Book',
        status: 'finished',
      };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockUpdatedBook);

      await BookController.updateBookForUser(req as AuthenticatedRequest, res as Response);

      expect(Book.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(mockBook.update).toHaveBeenCalledWith({
        title: 'Updated Book',
        status: 'finished',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: 1, title: 'Updated Book' });
    });

    it('should return 400 for invalid book ID', async () => {
      req.params = { id: 'invalid' };

      await BookController.updateBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid book ID' });
    });

    it('should return 404 when book is not found', async () => {
      req.params = { id: '1' };
      (Book.findOne as jest.Mock).mockResolvedValue(null);

      await BookController.updateBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Book not found' });
    });

    it('should return 401 when user is not authenticated', async () => {
      delete req.user;

      await BookController.updateBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('deleteBookForUser', () => {
    it('should delete book successfully', async () => {
      const mockBook = {
        id: 1,
        userId: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      req.params = { id: '1' };
      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);

      await BookController.deleteBookForUser(req as AuthenticatedRequest, res as Response);

      expect(Book.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(mockBook.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 400 for invalid book ID', async () => {
      req.params = { id: 'invalid' };

      await BookController.deleteBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid book ID' });
    });

    it('should return 404 when book is not found', async () => {
      req.params = { id: '1' };
      (Book.findOne as jest.Mock).mockResolvedValue(null);

      await BookController.deleteBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Book not found' });
    });

    it('should return 401 when user is not authenticated', async () => {
      delete req.user;

      await BookController.deleteBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('searchByIsbnForUser', () => {
    it('should search book by ISBN successfully', async () => {
      const mockBookData = {
        title: 'External Book',
        isbnCode: '1234567890',
        authors: [{
          name: 'Test',
          surname: 'Author',
          fullName: 'Test Author'
        }],
        categories: []
      };

      req.params = { isbn: '1234567890' };
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '1234567890',
        format: 'ISBN-10'
      } as IsbnValidationResult);
      mockIsbnService.lookupBook.mockResolvedValue({
        success: true,
        isbn: '1234567890',
        book: mockBookData,
        source: 'api'
      } as IsbnLookupResult);

      await BookController.searchByIsbnForUser(req as AuthenticatedRequest, res as Response);

      expect(mockValidateIsbn).toHaveBeenCalledWith('1234567890');
      expect(mockIsbnService.lookupBook).toHaveBeenCalledWith('1234567890');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockBookData);
    });

    it('should return 400 for invalid ISBN', async () => {
      req.params = { isbn: 'invalid-isbn' };
      mockValidateIsbn.mockReturnValue({
        isValid: false
      } as IsbnValidationResult);

      await BookController.searchByIsbnForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid ISBN format' });
    });

    it('should return 404 when book is not found in external databases', async () => {
      req.params = { isbn: '1234567890' };
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '1234567890',
        format: 'ISBN-10'
      } as IsbnValidationResult);
      mockIsbnService.lookupBook.mockResolvedValue({
        success: false,
        isbn: '1234567890',
        source: 'api'
      } as IsbnLookupResult);

      await BookController.searchByIsbnForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Book not found in external databases' 
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      delete req.user;

      await BookController.searchByIsbnForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should handle ISBN service errors', async () => {
      req.params = { isbn: '1234567890' };
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: '1234567890',
        format: 'ISBN-10'
      } as IsbnValidationResult);
      mockIsbnService.lookupBook.mockRejectedValue(new Error('Service unavailable'));

      await BookController.searchByIsbnForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Service unavailable',
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request parameters', async () => {
      req.params = { id: '' };

      await BookController.getBookById(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid book ID' });
    });

    it('should handle zero page number in getUserBooks', async () => {
      req.query = { page: '0', limit: '10' };
      (mockBook.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      // Should calculate offset as (0-1) * 10 = -10, but handled gracefully
      expect(mockBook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: -10, // This should be handled by the database
        })
      );
    });

    it('should handle missing body in createBookForUser', async () => {
      req.body = null;

      await BookController.createBookForUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Request body is required' });
    });

    it('should handle partial update data', async () => {
      const mockBook = {
        id: 1,
        userId: 1,
        update: jest.fn().mockResolvedValue(true),
      };

      const mockUpdatedBook = {
        id: 1,
        title: 'Original Title',
        toJSON: jest.fn().mockReturnValue({ id: 1, title: 'Original Title' }),
      };

      req.params = { id: '1' };
      req.body = { notes: 'Updated notes only' };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockUpdatedBook);

      await BookController.updateBookForUser(req as AuthenticatedRequest, res as Response);

      expect(mockBook.update).toHaveBeenCalledWith({
        notes: 'Updated notes only',
      });
    });

    it('should handle database connection failures', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.name = 'SequelizeConnectionRefusedError';
      
      mockBook.findAndCountAll.mockRejectedValue(connectionError);

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Connection refused',
      });
    });

    it('should handle invalid status filter', async () => {
      req.query = { status: 'invalid-status' };
      (mockBook.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

      await BookController.getUserBooks(req as AuthenticatedRequest, res as Response);

      // Should not include invalid status in where clause
      expect(mockBook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 }, // No status filter applied
        })
      );
    });
  });
});