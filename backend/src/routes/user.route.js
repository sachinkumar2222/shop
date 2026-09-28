import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { validateCreateUser } from '../validators/user.validator.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All user management routes are ADMIN only
router.get('/', authenticate, authorize('ADMIN'), userController.listUsers);
router.post('/', authenticate, authorize('ADMIN'), validateCreateUser, userController.createUser);
router.delete('/:id', authenticate, authorize('ADMIN'), userController.deleteUser);

export default router;
