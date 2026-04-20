import asyncHandler from '../middleware/asyncHandler.js';
import { uploadFileToDrive } from '../services/driveService.js';
import logger from '../utils/logger.js';

// @desc    Upload one or more images to Google Drive
// @route   POST /api/upload/image
// @access  Private
export const uploadImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded. Please attach at least one image.',
    });
  }

  const urls = await Promise.all(req.files.map((file) => uploadFileToDrive(file)));

  logger.info(`User ${req.user.id} uploaded ${urls.length} image(s)`);

  res.status(200).json({
    success: true,
    count: urls.length,
    data: { urls },
  });
});
