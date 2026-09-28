import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { validateProduct } from '../validators/product.validator.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Reads
router.get('/', authenticate, productController.getAllProducts);
router.get('/low-stock', authenticate, productController.getLowStockProducts);
router.get('/barcode/:barcode', authenticate, productController.getProductByBarcode);
router.get('/:id', authenticate, productController.getProductById);

// Writes (Admin only)
router.post('/', authenticate, authorize('ADMIN'), validateProduct, productController.createProduct);
router.put('/:id', authenticate, authorize('ADMIN'), validateProduct, productController.updateProduct);

export default router;
