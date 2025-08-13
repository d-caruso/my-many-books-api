// ================================================================
// src/routes/bookRoutes.ts
// Book management routes for authenticated users
// ================================================================

import { Router } from 'express';
import { BookController } from '../controllers/BookController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All book routes require authentication
router.use(authMiddleware);

// Book CRUD operations
router.get('/', BookController.getUserBooks);
router.get('/:id', BookController.getBookById);
router.post('/', BookController.createBookForUser);
router.put('/:id', BookController.updateBookForUser);
router.delete('/:id', BookController.deleteBookForUser);

// Book search operations
router.get('/search/isbn/:isbn', BookController.searchByIsbnForUser);

export default router;