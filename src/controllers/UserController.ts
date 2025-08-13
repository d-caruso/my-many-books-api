// ================================================================
// src/controllers/UserController.ts
// User management controller
// ================================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Book } from '../models/Book';
import { UserService } from '../middleware/auth';

export class UserController {
  // Get current user profile
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await UserService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        createdAt: user.creationDate,
        updatedAt: user.updateDate,
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update current user profile
  static async updateCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { name, surname } = req.body;

      // Validate input
      if (!name || !surname) {
        res.status(400).json({ error: 'Name and surname are required' });
        return;
      }

      if (typeof name !== 'string' || typeof surname !== 'string') {
        res.status(400).json({ error: 'Name and surname must be strings' });
        return;
      }

      if (name.length > 100 || surname.length > 100) {
        res.status(400).json({ error: 'Name and surname must be 100 characters or less' });
        return;
      }

      const user = await UserService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update user
      await user.update({ name, surname });

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        updatedAt: user.updateDate,
      });
    } catch (error) {
      console.error('Error updating current user:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's books
  static async getUserBooks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { page = 1, limit = 10, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = { userId: req.user.userId };
      if (status && ['in progress', 'paused', 'finished'].includes(status as string)) {
        whereClause.status = status;
      }

      const { count, rows: books } = await Book.findAndCountAll({
        where: whereClause,
        include: [
          { 
            model: require('../models/Author').Author, 
            as: 'authors',
            through: { attributes: [] }
          },
          { 
            model: require('../models/Category').Category, 
            as: 'categories',
            through: { attributes: [] }
          }
        ],
        limit: Number(limit),
        offset,
        order: [['title', 'ASC']],
      });

      res.status(200).json({
        books: books.map(book => ({
          id: book.id,
          title: book.title,
          isbnCode: book.isbnCode,
          editionNumber: book.editionNumber,
          editionDate: book.editionDate,
          status: book.status,
          notes: book.notes,
          authors: book.authors?.map(author => ({
            id: author.id,
            name: author.name,
            surname: author.surname,
            fullName: `${author.name} ${author.surname}`,
          })) || [],
          categories: book.categories?.map(category => ({
            id: category.id,
            name: category.name,
          })) || [],
          createdAt: book.creationDate,
          updatedAt: book.updateDate,
        })),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(count / Number(limit)),
          totalItems: count,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error fetching user books:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user statistics
  static async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = req.user.userId;

      // Get book counts by status
      const [
        totalBooks,
        inProgressBooks,
        pausedBooks,
        finishedBooks,
      ] = await Promise.all([
        Book.count({ where: { userId } }),
        Book.count({ where: { userId, status: 'in progress' } }),
        Book.count({ where: { userId, status: 'paused' } }),
        Book.count({ where: { userId, status: 'finished' } }),
      ]);

      // Get recent activity (last 5 books added)
      const recentBooks = await Book.findAll({
        where: { userId },
        order: [['creationDate', 'DESC']],
        limit: 5,
        attributes: ['id', 'title', 'creationDate'],
      });

      res.status(200).json({
        totalBooks,
        booksByStatus: {
          inProgress: inProgressBooks,
          paused: pausedBooks,
          finished: finishedBooks,
          unspecified: totalBooks - inProgressBooks - pausedBooks - finishedBooks,
        },
        completionRate: totalBooks > 0 ? Math.round((finishedBooks / totalBooks) * 100) : 0,
        recentBooks: recentBooks.map(book => ({
          id: book.id,
          title: book.title,
          addedAt: book.creationDate,
        })),
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Deactivate user account
  static async deactivateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await UserService.deactivateUser(req.user.userId);

      res.status(200).json({ 
        message: 'Account deactivated successfully',
        note: 'Your books will remain in the system but will no longer be accessible'
      });
    } catch (error) {
      console.error('Error deactivating user account:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete user account (hard delete)
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await UserService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Note: Books will have their userId set to NULL due to the foreign key constraint
      await user.destroy();

      res.status(200).json({ 
        message: 'Account deleted successfully',
        note: 'All personal data has been removed. Books will remain anonymized in the system.'
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}