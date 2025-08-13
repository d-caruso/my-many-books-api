// ================================================================
// tests/controllers/UserController.test.ts
// Comprehensive unit tests for UserController
// ================================================================

import { Response } from 'express';
import { UserController } from '../../src/controllers/UserController';
import { AuthenticatedRequest } from '../../src/middleware/auth';
import { User } from '../../src/models/User';
import { Book } from '../../src/models/Book';
import { UserService } from '../../src/middleware/auth';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/Book');
jest.mock('../../src/middleware/auth');

const mockUser = User as jest.Mocked<typeof User>;
const mockBook = Book as jest.Mocked<typeof Book>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('UserController', () => {
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
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return current user successfully', async () => {
      const mockUserData = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        getFullName: jest.fn().mockReturnValue('John Doe'),
        creationDate: new Date('2023-01-01'),
        updateDate: new Date('2023-01-02'),
      };

      mockUserService.getUserById.mockResolvedValue(mockUserData as any);

      await UserController.getCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        fullName: 'John Doe',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      await UserController.getCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockUserService.getUserById).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      await UserController.getCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockUserService.getUserById.mockRejectedValue(error);

      await UserController.getCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Database connection failed',
      });
    });
  });

  describe('updateCurrentUser', () => {
    it('should update user successfully', async () => {
      const mockUserData = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Smith', // Updated surname
        isActive: true,
        getFullName: jest.fn().mockReturnValue('John Smith'),
        updateDate: new Date('2023-01-03'),
        update: jest.fn().mockResolvedValue(true),
      };

      req.body = {
        name: 'John',
        surname: 'Smith',
      };

      mockUserService.getUserById.mockResolvedValue(mockUserData as any);

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(mockUserData.update).toHaveBeenCalledWith({ name: 'John', surname: 'Smith' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Smith',
        fullName: 'John Smith',
        isActive: true,
        updatedAt: new Date('2023-01-03'),
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 400 when name is missing', async () => {
      req.body = { surname: 'Doe' };

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and surname are required' });
    });

    it('should return 400 when surname is missing', async () => {
      req.body = { name: 'John' };

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and surname are required' });
    });

    it('should return 400 when name is not a string', async () => {
      req.body = { name: 123, surname: 'Doe' };

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and surname must be strings' });
    });

    it('should return 400 when name is too long', async () => {
      req.body = { name: 'a'.repeat(101), surname: 'Doe' };

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and surname must be 100 characters or less' });
    });

    it('should return 404 when user is not found', async () => {
      req.body = { name: 'John', surname: 'Doe' };
      mockUserService.getUserById.mockResolvedValue(null);

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('getUserBooks', () => {
    it('should return user books with pagination', async () => {
      const mockBooks = [
        {
          id: 1,
          title: 'Book 1',
          isbnCode: '1234567890',
          authors: [{ id: 1, name: 'Author', surname: 'One' }],
          categories: [{ id: 1, name: 'Fiction' }],
          creationDate: new Date('2023-01-01'),
          updateDate: new Date('2023-01-02'),
        },
        {
          id: 2,
          title: 'Book 2',
          isbnCode: '0987654321',
          authors: [],
          categories: [],
          creationDate: new Date('2023-01-03'),
          updateDate: new Date('2023-01-04'),
        },
      ];

      req.query = { page: '1', limit: '10' };

      mockBook.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockBooks as any,
      });

      await UserController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(mockBook.findAndCountAll).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: expect.any(Array),
        limit: 10,
        offset: 0,
        order: [['title', 'ASC']],
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        books: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Book 1',
            authors: [{ id: 1, name: 'Author', surname: 'One', fullName: 'Author One' }],
            categories: [{ id: 1, name: 'Fiction' }],
          }),
        ]),
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
      mockBook.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await UserController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(mockBook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1, status: 'in progress' },
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      await UserController.getUserBooks(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const recentBooks = [
        { id: 1, title: 'Recent Book 1', creationDate: new Date('2023-01-05') },
        { id: 2, title: 'Recent Book 2', creationDate: new Date('2023-01-04') },
      ];

      mockBook.count
        .mockResolvedValueOnce(10) // totalBooks
        .mockResolvedValueOnce(3)  // inProgressBooks
        .mockResolvedValueOnce(2)  // pausedBooks
        .mockResolvedValueOnce(4); // finishedBooks

      mockBook.findAll.mockResolvedValue(recentBooks as any);

      await UserController.getUserStats(req as AuthenticatedRequest, res as Response);

      expect(mockBook.count).toHaveBeenCalledTimes(4);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        totalBooks: 10,
        booksByStatus: {
          inProgress: 3,
          paused: 2,
          finished: 4,
          unspecified: 1, // 10 - 3 - 2 - 4
        },
        completionRate: 40, // (4/10) * 100
        recentBooks: [
          { id: 1, title: 'Recent Book 1', addedAt: new Date('2023-01-05') },
          { id: 2, title: 'Recent Book 2', addedAt: new Date('2023-01-04') },
        ],
      });
    });

    it('should handle zero completion rate', async () => {
      mockBook.count
        .mockResolvedValueOnce(0) // totalBooks
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockBook.findAll.mockResolvedValue([]);

      await UserController.getUserStats(req as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          completionRate: 0,
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      await UserController.getUserStats(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account successfully', async () => {
      mockUserService.deactivateUser.mockResolvedValue(undefined);

      await UserController.deactivateAccount(req as AuthenticatedRequest, res as Response);

      expect(mockUserService.deactivateUser).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Account deactivated successfully',
        note: 'Your books will remain in the system but will no longer be accessible'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      await UserController.deactivateAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockUserService.deactivateUser).not.toHaveBeenCalled();
    });

    it('should handle deactivation errors', async () => {
      const error = new Error('Deactivation failed');
      mockUserService.deactivateUser.mockRejectedValue(error);

      await UserController.deactivateAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Deactivation failed',
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account successfully', async () => {
      const mockUserData = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      mockUserService.getUserById.mockResolvedValue(mockUserData as any);

      await UserController.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(1);
      expect(mockUserData.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Account deleted successfully',
        note: 'All personal data has been removed. Books will remain anonymized in the system.'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      await UserController.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 404 when user is not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      await UserController.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle deletion errors', async () => {
      const mockUserData = {
        id: 1,
        destroy: jest.fn().mockRejectedValue(new Error('Deletion failed')),
      };

      mockUserService.getUserById.mockResolvedValue(mockUserData as any);

      await UserController.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Deletion failed',
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user service gracefully', async () => {
      mockUserService.getUserById.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await UserController.getCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Service unavailable',
      });
    });

    it('should handle malformed query parameters in getUserBooks', async () => {
      req.query = { page: 'invalid', limit: 'not-a-number' };
      mockBook.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await UserController.getUserBooks(req as AuthenticatedRequest, res as Response);

      // Should default to page 1, limit 10
      expect(mockBook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
        })
      );
    });

    it('should handle empty body in updateCurrentUser', async () => {
      req.body = {};

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and surname are required' });
    });

    it('should handle null/undefined values in updateCurrentUser', async () => {
      req.body = { name: null, surname: undefined };

      await UserController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and surname are required' });
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'SequelizeConnectionError';
      mockUserService.getUserById.mockRejectedValue(timeoutError);

      await UserController.getCurrentUser(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Connection timeout',
      });
    });
  });
});