import Order from '../models/order.js';
import Product from '../models/product.js';
import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';

// @desc    Get profit analytics for different time periods
// @route   GET /api/analytics/profit
// @access  Private/Admin
export const getProfitAnalytics = asyncHandler(async (req, res, next) => {
  const { period = 'day' } = req.query;

  let startDate, endDate = new Date();

  switch (period) {
    case 'day':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date('2020-01-01');
  }

  // Get profit data with CORRECT aggregation syntax
  const profitData = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        orderStatus: { $ne: 'cancelled' },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalCost: { $sum: '$totalCost' },
        totalProfit: { $sum: '$totalProfit' },
        orderCount: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' }
      }
    }
  ]);

  // Get daily profit for the chart with CORRECT syntax
  const dailyProfit = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        orderStatus: { $ne: 'cancelled' },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        cost: { $sum: '$totalCost' },
        profit: { $sum: '$totalProfit' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Get top selling products with CORRECT profit calculation
  const topProducts = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        orderStatus: { $ne: 'cancelled' },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.name' },
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { 
          $sum: { 
            $multiply: ['$items.sellingPrice', '$items.quantity'] 
          } 
        },
        totalCost: { 
          $sum: { 
            $multiply: ['$items.buyingPrice', '$items.quantity'] 
          } 
        }
      }
    },
    {
      $addFields: {
        totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    {
      $sort: { totalProfit: -1 }
    },
    {
      $limit: 10
    }
  ]);

  const result = profitData[0] || {
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0
  };

  res.status(200).json({
    success: true,
    data: {
      period,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        ...result,
        profitMargin: result.totalRevenue > 0 
          ? ((result.totalProfit / result.totalRevenue) * 100).toFixed(2)
          : 0
      },
      dailyProfit,
      topProducts: topProducts.map(product => ({
        ...product,
        productDetails: product.productDetails[0] || null,
        profitMargin: product.totalRevenue > 0 
          ? ((product.totalProfit / product.totalRevenue) * 100).toFixed(2)
          : 0
      }))
    }
  });
});

// @desc    Get comprehensive dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
export const getDashboardAnalytics = asyncHandler(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  // Today's metrics
  const todayMetrics = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        orderStatus: { $ne: 'cancelled' },
        createdAt: { $gte: today }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        cost: { $sum: '$totalCost' },
        profit: { $sum: '$totalProfit' },
        orders: { $sum: 1 }
      }
    }
  ]);

  // Yesterday's metrics for comparison
  const yesterdayMetrics = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        orderStatus: { $ne: 'cancelled' },
        createdAt: { $gte: yesterday, $lt: today }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        cost: { $sum: '$totalCost' },
        profit: { $sum: '$totalProfit' },
        orders: { $sum: 1 }
      }
    }
  ]);

  // Current inventory value
  const inventoryValue = await Product.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalInventoryCost: { $sum: { $multiply: ['$buyingPrice', '$stock'] } },
        totalInventoryValue: { $sum: { $multiply: ['$sellingPrice', '$stock'] } },
        totalPotentialProfit: { 
          $sum: { 
            $multiply: [
              { $subtract: ['$sellingPrice', '$buyingPrice'] },
              '$stock'
            ]
          }
        },
        productCount: { $sum: 1 }
      }
    }
  ]);

  // Low stock products
  const lowStockProducts = await Product.find({
    stock: { $lte: 10 },
    isActive: true
  }).select('name stock buyingPrice sellingPrice');

  const todayData = todayMetrics[0] || { revenue: 0, cost: 0, profit: 0, orders: 0 };
  const yesterdayData = yesterdayMetrics[0] || { revenue: 0, cost: 0, profit: 0, orders: 0 };
  const inventoryData = inventoryValue[0] || { 
    totalInventoryCost: 0, 
    totalInventoryValue: 0, 
    totalPotentialProfit: 0, 
    productCount: 0 
  };

  // Calculate growth percentages
  const revenueGrowth = yesterdayData.revenue > 0 
    ? ((todayData.revenue - yesterdayData.revenue) / yesterdayData.revenue * 100).toFixed(2)
    : todayData.revenue > 0 ? 100 : 0;

  const profitGrowth = yesterdayData.profit > 0 
    ? ((todayData.profit - yesterdayData.profit) / yesterdayData.profit * 100).toFixed(2)
    : todayData.profit > 0 ? 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      today: {
        revenue: todayData.revenue,
        cost: todayData.cost,
        profit: todayData.profit,
        orders: todayData.orders,
        averageOrderValue: todayData.orders > 0 ? todayData.revenue / todayData.orders : 0
      },
      growth: {
        revenue: parseFloat(revenueGrowth),
        profit: parseFloat(profitGrowth),
        orders: yesterdayData.orders > 0 
          ? ((todayData.orders - yesterdayData.orders) / yesterdayData.orders * 100).toFixed(2)
          : todayData.orders > 0 ? 100 : 0
      },
      inventory: inventoryData,
      lowStockProducts: lowStockProducts.slice(0, 5), // Top 5 low stock products
      alerts: {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: await Product.countDocuments({ stock: 0, isActive: true })
      }
    }
  });
});

// @desc    Get product performance analytics
// @route   GET /api/analytics/products
// @access  Private/Admin
export const getProductAnalytics = asyncHandler(async (req, res, next) => {
  const { period = 'month' } = req.query;

  let startDate = new Date();
  if (period === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
  else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

  const productPerformance = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        orderStatus: { $ne: 'cancelled' },
        createdAt: { $gte: startDate }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.name' },
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.sellingPrice', '$items.quantity'] } },
        totalCost: { $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] } },
        averageSellingPrice: { $avg: '$items.sellingPrice' }
      }
    },
    {
      $addFields: {
        totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
        profitMargin: {
          $cond: {
            if: { $eq: ['$totalRevenue', 0] },
            then: 0,
            else: { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] }, 100] }
          }
        }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    {
      $sort: { totalProfit: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      period,
      productPerformance: productPerformance.map(item => ({
        ...item,
        productDetails: item.productDetails[0] || null
      }))
    }
  });
});