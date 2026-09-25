const multer = require('multer');

// Use memory storage for both cases
const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Deliberately exclude SVG: browser-rendered SVG can contain active content.
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Use a JPG, PNG, WebP, or GIF image');
    error.statusCode = 400;
    cb(error, false);
  }
};

// PDF file filter
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// Image upload middleware
const imageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 } // 5MB each, at most 10
});

const productImagesUpload = (req, res, next) => {
  imageUpload.array('images', 10)(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Each image must be 5 MB or smaller' });
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Upload up to 10 product images' });
    }
    return res.status(error.statusCode || 400).json({ error: error.message || 'Invalid image upload' });
  });
};

// PDF upload middleware
const pdfUpload = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB (adjust as needed)
});

module.exports = {
  imageUpload,
  productImagesUpload,
  pdfUpload
};
