import express from 'express';
import { body } from 'express-validator';
import {
  getProducts,
  getProduct,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  stockIn,
} from '../controller/porductController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Product validation rules
const productValidation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('buyingPrice')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('sellingPrice')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('category')
    .isIn(['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'])
    .withMessage('Invalid category'),
];

// Stock-in validation rules
const stockInValidation = [
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
];

// PUBLIC ROUTES
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/low-stock', protect, authorize('admin'), getLowStockProducts);
router.get('/:id', getProduct);

// Add the /create route specifically
router.post('/create', protect, productValidation, createProduct);

// Or use the standard RESTful routes (choose one approach)
router.post('/', protect, productValidation, createProduct);
router.put('/:id', protect, authorize('admin'), productValidation, updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);
router.patch('/:id/stock-in', protect, authorize('admin'), stockInValidation, stockIn);

export default router;