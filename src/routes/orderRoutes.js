import express from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getMyOrderReport,
  getAllOrders,
  updateOrderStatus,
  processOrderPayment,
  getOrderSuccess,
} from '../controller/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order validation rules
const orderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress.fullName')
    .notEmpty()
    .withMessage('Full name is required'),
  body('shippingAddress.address')
    .notEmpty()
    .withMessage('Address is required'),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required'),
  body('shippingAddress.postalCode')
    .notEmpty()
    .withMessage('Postal code is required'),
  body('shippingAddress.country')
    .notEmpty()
    .withMessage('Country is required'),
  body('paymentMethod')
    .isIn(['credit_card', 'paypal', 'cash_on_delivery'])
    .withMessage('Invalid payment method'),
];

// All routes are protected
router.use(protect);

// User routes
router.post('/', orderValidation, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/report', getMyOrderReport);
router.get('/:id', getOrderById);
router.get('/:id/success', getOrderSuccess);
router.post('/:id/process', processOrderPayment);

// Admin routes
router.get('/', authorize('admin'), getAllOrders);
router.put('/:id/status', authorize('admin'), updateOrderStatus);

export default router;