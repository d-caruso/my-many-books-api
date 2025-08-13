// ================================================================
// src/routes/userRoutes.ts
// User management routes
// ================================================================

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// User profile endpoints (without "profile" in URI)
router.get('/', UserController.getCurrentUser);               // GET user info
router.put('/', UserController.updateCurrentUser);            // PUT to update user info 
router.delete('/', UserController.deleteAccount);             // DELETE to delete account (no "delete" in URI)

// User books endpoints
router.get('/books', UserController.getUserBooks);

// User statistics
router.get('/stats', UserController.getUserStats);

// Account deactivation (PUT without "deactivate" in URI - but needs different route to avoid conflict)
router.patch('/', UserController.deactivateAccount);          // PATCH to deactivate account (no "deactivate" in URI)

export default router;