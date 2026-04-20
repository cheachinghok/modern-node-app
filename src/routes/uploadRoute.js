import express from 'express';
import upload from '../config/multer.js';
import { uploadImages } from '../controller/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/upload/image
// Accepts up to 5 images per request (field name: "images")
router.post('/image', protect, upload.array('images', 5), uploadImages);

export default router;
