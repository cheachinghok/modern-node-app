import express from 'express';
import { getExchangeRate, setExchangeRate } from '../controller/exchangeRateController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getExchangeRate);
router.put('/', protect, authorize('admin'), setExchangeRate);

export default router;
