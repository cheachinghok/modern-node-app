import Product from '../models/product.js';
import ExchangeRate from '../models/exchangeRate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

async function getExchangeRateValue() {
  let rateDoc = await ExchangeRate.findOne();
  if (!rateDoc) {
    rateDoc = await ExchangeRate.create({ usdToKhr: 4100 });
  }
  return rateDoc.usdToKhr;
}

function resolvePrices(body, rate) {
  let { buyingPrice, sellingPrice, buyingPriceKHR, sellingPriceKHR } = body;

  buyingPrice = buyingPrice !== undefined ? parseFloat(buyingPrice) : null;
  sellingPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : null;
  buyingPriceKHR = buyingPriceKHR !== undefined ? parseFloat(buyingPriceKHR) : null;
  sellingPriceKHR = sellingPriceKHR !== undefined ? parseFloat(sellingPriceKHR) : null;

  if (buyingPrice !== null && buyingPriceKHR === null) {
    buyingPriceKHR = Math.round(buyingPrice * rate);
  } else if (buyingPriceKHR !== null && buyingPrice === null) {
    buyingPrice = parseFloat((buyingPriceKHR / rate).toFixed(2));
  }

  if (sellingPrice !== null && sellingPriceKHR === null) {
    sellingPriceKHR = Math.round(sellingPrice * rate);
  } else if (sellingPriceKHR !== null && sellingPrice === null) {
    sellingPrice = parseFloat((sellingPriceKHR / rate).toFixed(2));
  }

  return { buyingPrice, sellingPrice, buyingPriceKHR, sellingPriceKHR };
}

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // If logged in as a regular user, show only their own products
  if (req.user && req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }

  // Search
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Filter by category (accepts category ID)
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Filter by price range (sellingPrice)
  if (req.query.minPrice || req.query.maxPrice) {
    query.sellingPrice = {};
    if (req.query.minPrice) query.sellingPrice.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) query.sellingPrice.$lte = parseFloat(req.query.maxPrice);
  }

  const products = await Product.find(query)
    .populate('createdBy', 'name email')
    .populate('category', 'name description')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
    data: products,
  });
});

// @desc    Search products with flexible filtering and sorting
// @route   GET /api/products/search
// @access  Public
export const searchProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    inStock,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = req.query;

  let query = { isActive: true };

  // If logged in as a regular user, show only their own products
  if (req.user && req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) query.category = category; // category ID
  if (minPrice || maxPrice) {
    query.sellingPrice = {};
    if (minPrice) query.sellingPrice.$gte = parseFloat(minPrice);
    if (maxPrice) query.sellingPrice.$lte = parseFloat(maxPrice);
  }
  if (inStock === 'true') query.stock = { $gt: 0 };

  const allowedSortFields = ['name', 'sellingPrice', 'rating', 'createdAt'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('createdBy', 'name email')
      .populate('category', 'name description')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    pagination: {
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
    data: products,
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('category', 'name description');

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { name } = req.body;

  // Check if product name already exists (case-insensitive)
  const existingProduct = await Product.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });

  if (existingProduct) {
    return res.status(400).json({
      success: false,
      message: `Product with name "${name}" already exists`,
      existingProduct: {
        id: existingProduct._id,
        name: existingProduct.name,
        category: existingProduct.category
      }
    });
  }

  const rate = await getExchangeRateValue();
  const { buyingPrice, sellingPrice, buyingPriceKHR, sellingPriceKHR } = resolvePrices(req.body, rate);

  // Validate that selling price is greater than buying price
  if (sellingPrice <= buyingPrice) {
    return res.status(400).json({
      success: false,
      message: 'Selling price must be greater than buying price',
    });
  }

  req.body.buyingPrice = buyingPrice;
  req.body.sellingPrice = sellingPrice;
  req.body.buyingPriceKHR = buyingPriceKHR;
  req.body.sellingPriceKHR = sellingPriceKHR;
  req.body.createdBy = req.user.id;

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  // Regular users can only update their own products
  if (req.user.role !== 'admin' && product.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this product',
    });
  }

  const hasPriceField = ['buyingPrice', 'sellingPrice', 'buyingPriceKHR', 'sellingPriceKHR'].some(
    (f) => req.body[f] !== undefined
  );

  if (hasPriceField) {
    const rate = await getExchangeRateValue();
    const merged = {
      buyingPrice: req.body.buyingPrice ?? product.buyingPrice,
      sellingPrice: req.body.sellingPrice ?? product.sellingPrice,
      buyingPriceKHR: req.body.buyingPriceKHR,
      sellingPriceKHR: req.body.sellingPriceKHR,
    };
    const resolved = resolvePrices(merged, rate);
    req.body.buyingPrice = resolved.buyingPrice;
    req.body.sellingPrice = resolved.sellingPrice;
    req.body.buyingPriceKHR = resolved.buyingPriceKHR;
    req.body.sellingPriceKHR = resolved.sellingPriceKHR;

    if (req.body.sellingPrice <= req.body.buyingPrice) {
      return res.status(400).json({
        success: false,
        message: 'Selling price must be greater than buying price',
      });
    }
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  // Regular users can only delete their own products
  if (req.user.role !== 'admin' && product.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this product',
    });
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private (user sees own products only; admin sees all)
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { stock: { $lte: threshold }, isActive: true };

  // Regular users can only see low-stock alerts for their own products
  if (req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .select('name stock buyingPrice sellingPrice buyingPriceKHR sellingPriceKHR category')
      .sort({ stock: 1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    pagination: { page, pages: Math.ceil(total / limit), limit },
    data: products,
  });
});

// @desc    Add stock to a product (stock-in)
// @route   PATCH /api/products/:id/stock-in
// @access  Private/Admin
export const stockIn = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { quantity } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    { $inc: { stock: quantity } },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: `Stock updated. Added ${quantity} unit(s).`,
    data: updated,
  });
});