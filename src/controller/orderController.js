import Order from '../models/order.js';
import Product from '../models/product.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { items, shippingAddress, paymentMethod } = req.body;

  // Validate items and calculate totals with profit
  let totalAmount = 0;
  let totalCost = 0;
  let totalAmountKHR = 0;
  let totalCostKHR = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found: ${item.product}`,
      });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
      });
    }

    const itemRevenue = product.sellingPrice * item.quantity;
    const itemCost = product.buyingPrice * item.quantity;

    totalAmount += itemRevenue;
    totalCost += itemCost;
    totalAmountKHR += product.sellingPriceKHR * item.quantity;
    totalCostKHR += product.buyingPriceKHR * item.quantity;

    orderItems.push({
      name: product.name,
      quantity: item.quantity,
      price: product.sellingPrice,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      priceKHR: product.sellingPriceKHR,
      buyingPriceKHR: product.buyingPriceKHR,
      sellingPriceKHR: product.sellingPriceKHR,
      product: item.product,
    });
  }

  const totalProfit = totalAmount - totalCost;
  const totalProfitKHR = totalAmountKHR - totalCostKHR;

  // Create order
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    totalAmount,
    totalCost,
    totalProfit,
    totalAmountKHR,
    totalCostKHR,
    totalProfitKHR,
    shippingAddress,
    paymentMethod,
    paymentStatus: 'pending',
    orderStatus: 'pending',
  });

  // Populate user and product details
  await order.populate('user', 'name email');
  await order.populate('items.product', 'name images');

  logger.info(`Order created: ${order.orderNumber} | revenue: ${totalAmount} | profit: ${totalProfit}`);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

// @desc    Process payment and update order
// @route   POST /api/orders/:id/process
// @access  Private
export const processOrderPayment = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Check if user owns the order or is admin
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to process this order',
    });
  }

  // Simulate payment processing
  // In real app, integrate with payment gateway like Stripe, PayPal, etc.
  const { paymentSuccess = true } = req.body;

  if (paymentSuccess) {
    order.paymentStatus = 'paid';
    order.orderStatus = 'delivered';
    order.paidAt = new Date();

    await order.save();

    logger.info(`Payment processed for order: ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: order,
    });
  } else {
    order.paymentStatus = 'failed';
    await order.save();

    res.status(400).json({
      success: false,
      message: 'Payment failed',
      data: order,
    });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name images category');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Check if user owns the order or is admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this order',
    });
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Get logged in user orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id })
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderStatus } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  order.orderStatus = orderStatus;

  if (orderStatus === 'delivered') {
    order.deliveredAt = new Date();
  }

  await order.save();
  await order.populate('user', 'name email');

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: order,
  });
});

// @desc    Get order profit report (per day or per month) for logged in user
// @route   GET /api/orders/report
// @access  Private
export const getMyOrderReport = asyncHandler(async (req, res) => {
  const { period = 'daily', startDate, endDate } = req.query;

  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const dateFormat = period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

  const matchStage = { user: req.user._id, createdAt: { $gte: start, $lte: end } };

  // Time-series: count ALL orders regardless of status — payment status is display-only
  const timeSeriesPipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        profit: { $sum: '$totalProfit' },
        revenue: { $sum: '$totalAmount' },
        cost: { $sum: '$totalCost' },
        orders: { $sum: 1 },
        paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        unpaidOrders: { $sum: { $cond: [{ $ne: ['$paymentStatus', 'paid'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        profit: 1,
        revenue: 1,
        cost: 1,
        orders: 1,
        paidOrders: 1,
        unpaidOrders: 1,
      },
    },
  ];

  // Payment status summary across the whole period
  const paymentSummaryPipeline = [
    { $match: matchStage },
    { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
  ];

  const [data, paymentCounts] = await Promise.all([
    Order.aggregate(timeSeriesPipeline),
    Order.aggregate(paymentSummaryPipeline),
  ]);

  const paymentSummary = paymentCounts.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, { paid: 0, pending: 0, failed: 0, refunded: 0 });

  const summary = data.reduce(
    (acc, row) => ({
      totalProfit: acc.totalProfit + row.profit,
      totalRevenue: acc.totalRevenue + row.revenue,
      totalCost: acc.totalCost + row.cost,
      totalOrders: acc.totalOrders + row.orders,
    }),
    { totalProfit: 0, totalRevenue: 0, totalCost: 0, totalOrders: 0 }
  );

  res.status(200).json({
    success: true,
    period,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    note: 'All orders are counted toward profit regardless of payment or delivery status. paymentSummary is for display only.',
    summary,
    paymentSummary,
    data,
  });
});

// @desc    Get order profit report for all users (Admin) — filterable by userId
// @route   GET /api/orders/report/admin
// @access  Private/Admin
export const getOrderReportAdmin = asyncHandler(async (req, res) => {
  const { period = 'daily', startDate, endDate, userId } = req.query;

  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const dateFormat = period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

  const matchStage = { createdAt: { $gte: start, $lte: end } };
  if (userId) {
    const { default: mongoose } = await import('mongoose');
    matchStage.user = new mongoose.Types.ObjectId(userId);
  }

  // Time-series: ALL orders count — payment status is display-only
  const timeSeriesPipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        profit: { $sum: '$totalProfit' },
        revenue: { $sum: '$totalAmount' },
        cost: { $sum: '$totalCost' },
        orders: { $sum: 1 },
        paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        unpaidOrders: { $sum: { $cond: [{ $ne: ['$paymentStatus', 'paid'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        profit: 1,
        revenue: 1,
        cost: 1,
        orders: 1,
        paidOrders: 1,
        unpaidOrders: 1,
      },
    },
  ];

  // Per-user breakdown
  const userBreakdownPipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$user',
        totalProfit: { $sum: '$totalProfit' },
        totalRevenue: { $sum: '$totalAmount' },
        totalCost: { $sum: '$totalCost' },
        totalOrders: { $sum: 1 },
        paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        unpaidOrders: { $sum: { $cond: [{ $ne: ['$paymentStatus', 'paid'] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmpty: true } },
    { $sort: { totalProfit: -1 } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        name: '$userInfo.name',
        email: '$userInfo.email',
        totalProfit: 1,
        totalRevenue: 1,
        totalCost: 1,
        totalOrders: 1,
        paidOrders: 1,
        unpaidOrders: 1,
      },
    },
  ];

  // Payment status counts across the period
  const paymentSummaryPipeline = [
    { $match: matchStage },
    { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
  ];

  const [timeSeries, userBreakdown, paymentCounts] = await Promise.all([
    Order.aggregate(timeSeriesPipeline),
    Order.aggregate(userBreakdownPipeline),
    Order.aggregate(paymentSummaryPipeline),
  ]);

  const paymentSummary = paymentCounts.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, { paid: 0, pending: 0, failed: 0, refunded: 0 });

  const summary = timeSeries.reduce(
    (acc, row) => ({
      totalProfit: acc.totalProfit + row.profit,
      totalRevenue: acc.totalRevenue + row.revenue,
      totalCost: acc.totalCost + row.cost,
      totalOrders: acc.totalOrders + row.orders,
    }),
    { totalProfit: 0, totalRevenue: 0, totalCost: 0, totalOrders: 0 }
  );

  res.status(200).json({
    success: true,
    period,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    filteredByUser: userId || null,
    note: 'All orders are counted toward profit regardless of payment or delivery status. paymentSummary is for display only.',
    summary,
    paymentSummary,
    data: timeSeries,
    userBreakdown,
  });
});

// @desc    Get order success details
// @route   GET /api/orders/:id/success
// @access  Private
export const getOrderSuccess = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name images');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Check if user owns the order
  if (order.user._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this order',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order completed successfully!',
    data: {
      order: order,
      successDetails: {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        trackingAvailable: order.orderStatus === 'shipped',
        supportEmail: 'support@yourstore.com',
      },
    },
  });
});
