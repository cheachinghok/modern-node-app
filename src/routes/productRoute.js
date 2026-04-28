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
import { protect, authorize, optionalProtect } from '../middleware/authMiddleware.js';

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
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Buying price must be a positive number'),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('buyingPriceKHR')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Buying price (KHR) must be a positive number'),
  body('sellingPriceKHR')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price (KHR) must be a positive number'),
  body('buyingPrice').custom((value, { req }) => {
    if (value === undefined && req.body.buyingPriceKHR === undefined) {
      throw new Error('Either buyingPrice (USD) or buyingPriceKHR must be provided');
    }
    return true;
  }),
  body('sellingPrice').custom((value, { req }) => {
    if (value === undefined && req.body.sellingPriceKHR === undefined) {
      throw new Error('Either sellingPrice (USD) or sellingPriceKHR must be provided');
    }
    return true;
  }),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
];

// Stock-in validation rules
const stockInValidation = [
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
];

// Public routes — filtered by ownership when token is present
router.get('/', optionalProtect, getProducts);
router.get('/search', optionalProtect, searchProducts);
router.get('/low-stock', protect, getLowStockProducts);
router.get('/:id', getProduct);

// Add the /create route specifically
router.post('/create', protect, productValidation, createProduct);

// Or use the standard RESTful routes (choose one approach)
router.post('/', protect, productValidation, createProduct);
router.put('/:id', protect, productValidation, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.patch('/:id/stock-in', protect, authorize('admin'), stockInValidation, stockIn);

export default router;