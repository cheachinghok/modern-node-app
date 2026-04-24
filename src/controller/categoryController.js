import Category from '../models/category.js';
import User from '../models/user.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { validationResult } from 'express-validator';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private (user sees own categories only; admin sees all)
export const getCategories = asyncHandler(async (req, res) => {
  const query = { isActive: true };

  if (req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }

  const categories = await Category.find(query)
    .populate('createdBy', 'name email')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private (user can only get their own; admin can get any)
export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('createdBy', 'name email');

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (req.user.role !== 'admin' && category.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this category' });
  }

  res.status(200).json({ success: true, data: category });
});

// @desc    Create category
// @route   POST /api/categories
// @access  Private (admin can assign to a specific user via userId; user creates for themselves)
export const createCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  // Admin can pass userId to assign category to a specific user
  let assignedTo = req.user.id;
  if (req.user.role === 'admin' && req.body.userId) {
    const targetUser = await User.findById(req.body.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }
    assignedTo = req.body.userId;
  }

  const existing = await Category.findOne({
    name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
    createdBy: assignedTo,
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Category "${req.body.name}" already exists for this user`,
    });
  }

  const { userId, ...categoryData } = req.body;

  const category = await Category.create({
    ...categoryData,
    createdBy: assignedTo,
  });

  res.status(201).json({ success: true, data: category });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (owner or admin)
export const updateCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (req.user.role !== 'admin' && category.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this category',
    });
  }

  const updated = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: updated });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (owner or admin)
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (req.user.role !== 'admin' && category.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this category',
    });
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, message: 'Category deleted successfully' });
});
