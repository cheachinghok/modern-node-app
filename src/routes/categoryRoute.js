import express from 'express';
import { body } from 'express-validator';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controller/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const categoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 })
    .withMessage('Category name cannot exceed 50 characters'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
];

// Public
router.get('/', getCategories);
router.get('/:id', getCategory);

// Private — owner or admin
router.post('/', protect, categoryValidation, createCategory);
router.put('/:id', protect, categoryValidation, updateCategory);
router.delete('/:id', protect, deleteCategory);

export default router;
