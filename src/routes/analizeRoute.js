import express from 'express';
import {
  getProfitAnalytics,
  getDashboardAnalytics,
  getProductAnalytics,
} from '../controller/analizeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// /profit and /products are accessible to all authenticated users (scoped by ownership for non-admins)
router.get('/profit', getProfitAnalytics);
router.get('/products', getProductAnalytics);

// /dashboard is admin-only (system-wide view)
router.get('/dashboard', authorize('admin'), getDashboardAnalytics);

export default router;