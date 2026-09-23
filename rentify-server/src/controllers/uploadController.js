// controllers/uploadController.js
const cloudinary = require('cloudinary').v2;

// Enhanced configuration with timeout and retry settings
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 60000, // 60 second timeout
  upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET // Optional
});

// Verify configuration on startup
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.api.ping()
    .then(result => console.log('Cloudinary connection test:', result))
    .catch(error => console.error('Cloudinary connection failed:', error));
} else {
  console.log('Cloudinary credentials missing or not configured. Image uploads will require valid credentials.');
}

exports.uploadImage = async (req, res) => {
  try {
    const { websiteId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Uploading image to Cloudinary...');
    
    // Validate Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary configuration is missing');
    }

    const result = await new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'auto',
        folder: websiteId || 'default',
        timeout: 60000
      };

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload successful:', result.public_id);
            resolve(result);
          }
        }
      );
      
      stream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });
      
      stream.end(req.file.buffer);
    });

    res.json({ 
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload controller error:', error);
    
    // More specific error handling
    if (error.message.includes('ENOTFOUND') || error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: 'Service temporarily unavailable. Cannot connect to image service.',
        details: 'Network connectivity issue'
      });
    } else if (error.message.includes('configuration')) {
      res.status(500).json({ 
        error: 'Server configuration error',
        details: error.message
      });
    } else {
      res.status(400).json({ 
        error: 'Upload failed',
        details: error.message
      });
    }
  }
};

exports.uploadPDF = async (req, res) => {
  try {
    const { websiteId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Validate configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary configuration is missing');
    }

    const result = await new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'raw',
        folder: `${websiteId || 'default'}/invoices`,
        allowed_formats: ['pdf'],
        timeout: 60000
      };

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary PDF upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      stream.on('error', reject);
      stream.end(req.file.buffer);
    });

    res.json({ 
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    
    if (error.message.includes('ENOTFOUND') || error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        details: 'Cannot connect to file service'
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};