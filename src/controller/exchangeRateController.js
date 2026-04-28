import ExchangeRate from '../models/exchangeRate.js';
import asyncHandler from '../middleware/asyncHandler.js';

// @desc    Get current exchange rate
// @route   GET /api/exchange-rate
// @access  Private
export const getExchangeRate = asyncHandler(async (req, res) => {
  let rate = await ExchangeRate.findOne().populate('updatedBy', 'name email');

  if (!rate) {
    rate = await ExchangeRate.create({ usdToKhr: 4100 });
  }

  res.status(200).json({
    success: true,
    data: {
      usdToKhr: rate.usdToKhr,
      updatedBy: rate.updatedBy,
      updatedAt: rate.updatedAt,
    },
  });
});

// @desc    Set exchange rate
// @route   PUT /api/exchange-rate
// @access  Private/Admin
export const setExchangeRate = asyncHandler(async (req, res) => {
  const { usdToKhr } = req.body;

  if (!usdToKhr || isNaN(usdToKhr) || Number(usdToKhr) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'usdToKhr must be a positive number',
    });
  }

  const rate = await ExchangeRate.findOneAndUpdate(
    {},
    { usdToKhr: Number(usdToKhr), updatedBy: req.user.id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('updatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Exchange rate updated successfully',
    data: {
      usdToKhr: rate.usdToKhr,
      updatedBy: rate.updatedBy,
      updatedAt: rate.updatedAt,
    },
  });
});
