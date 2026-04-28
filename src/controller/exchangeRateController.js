import ExchangeRate from '../models/exchangeRate.js';
import Product from '../models/product.js';
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

  const newRate = Number(usdToKhr);

  const rate = await ExchangeRate.findOneAndUpdate(
    {},
    { usdToKhr: newRate, updatedBy: req.user.id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('updatedBy', 'name email');

  // Bulk-recalculate KHR prices for all products based on their stored USD prices
  const products = await Product.find({});
  const bulkOps = products.map((p) => ({
    updateOne: {
      filter: { _id: p._id },
      update: {
        $set: {
          buyingPriceKHR: Math.round(p.buyingPrice * newRate),
          sellingPriceKHR: Math.round(p.sellingPrice * newRate),
        },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  res.status(200).json({
    success: true,
    message: `Exchange rate updated successfully. ${bulkOps.length} product(s) KHR prices recalculated.`,
    data: {
      usdToKhr: rate.usdToKhr,
      updatedBy: rate.updatedBy,
      updatedAt: rate.updatedAt,
      productsUpdated: bulkOps.length,
    },
  });
});
