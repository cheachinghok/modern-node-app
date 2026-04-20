import multer from 'multer';

const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB per image.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "images" as the field name.',
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  // Pass non-multer errors to the existing generic error handler
  next(err);
};

export default multerErrorHandler;
