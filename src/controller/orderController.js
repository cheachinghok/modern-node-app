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

    orderItems.push({
      name: product.name,
      quantity: item.quantity,
      price: product.sellingPrice,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      product: item.product,
    });
  }

  const totalProfit = totalAmount - totalCost;

  // Create order
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    totalAmount,
    totalCost,
    totalProfit,
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
