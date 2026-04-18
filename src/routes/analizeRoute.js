import express from 'express';
import {
  getProfitAnalytics,
  getDashboardAnalytics,
  getProductAnalytics,
} from '../controller/analizeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analytics routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/profit', getProfitAnalytics);
router.get('/dashboard', getDashboardAnalytics);
router.get('/products', getProductAnalytics);

export default router;