import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { validateCategory } from '../validators/category.validator.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Public/Cashier reads
router.get('/', authenticate, categoryController.getAllCategories);
router.get('/:id', authenticate, categoryController.getCategoryById);

// Admin writes
router.post('/', authenticate, authorize('ADMIN'), validateCategory, categoryController.createCategory);
router.put('/:id', authenticate, authorize('ADMIN'), validateCategory, categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.deleteCategory);

export default router;
