const cloudinary = require('cloudinary').v2;
const { uploadBuffer, verifyConnection } = require('./cloudinaryUploadService');

verifyConnection()
  .then(() => console.log('Cloudinary image storage is ready'))
  .catch((error) => console.warn(
    'Cloudinary image storage is unavailable:',
    error.code === 'CLOUDINARY_NOT_CONFIGURED' ? 'credentials are not configured' : 'credential or network check failed'
  ));

const uploadFolder = (req) => {
  const tenantId = req.store?.id || req.website?.storeId || req.params.storeId || req.params.websiteId;
  return `rentify/stores/${tenantId}/products`;
};

const respondToUploadError = (res, error) => {
  if (error.code === 'CLOUDINARY_NOT_CONFIGURED') {
    return res.status(503).json({ error: 'Image storage is temporarily unavailable' });
  }

  const authFailure = error.http_code === 401 || error.http_code === 403;
  return res.status(authFailure ? 503 : 502).json({
    error: authFailure
      ? 'Image storage credentials need administrator attention'
      : 'The image could not be uploaded. Please try again.',
  });
};

exports.uploadProductImages = async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return res.status(400).json({ error: 'Choose at least one image' });

  try {
    const images = await Promise.all(
      files.map((file) => uploadBuffer(file.buffer, { folder: uploadFolder(req) }))
    );
    return res.status(201).json({ images });
  } catch (error) {
    console.error('Product image upload failed', {
      code: error.code || null,
      httpCode: error.http_code || null,
    });
    return respondToUploadError(res, error);
  }
};

exports.uploadImage = async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = async (payload) => {
    const uploaded = payload?.images?.[0];
    if (uploaded && (req.query.isLogo === 'true' || req.query.type === 'logo')) {
      try {
        const { WebsiteContent } = require('../../models');
        const websiteId = req.params.websiteId || req.website?.id;
        if (websiteId) {
          const [logoContent] = await WebsiteContent.findOrCreate({
            where: { websiteId, category: 'Header', label: 'Logo' },
            defaults: { type: 'image', value: { url: uploaded.url } },
          });
          if (logoContent) {
            logoContent.value = { url: uploaded.url };
            logoContent.type = 'image';
            await logoContent.save();
          }
          const cache = require('../../utils/cache');
          if (cache && cache.invalidateWebsiteCache) {
            await cache.invalidateWebsiteCache(websiteId);
          }
        }
      } catch (err) {
        console.warn('Failed to associate uploaded logo with website:', err);
      }
    }
    // A cover chosen during onboarding replaces the template's stock banner photos
    if (uploaded && req.query.type === 'cover') {
      try {
        const { WebsiteContent } = require('../../models');
        const websiteId = req.params.websiteId || req.website?.id;
        if (websiteId) {
          const existing = await WebsiteContent.findOne({ where: { websiteId, label: 'Hero Image' } });
          if (existing) {
            existing.value = [uploaded.url];
            await existing.save();
          } else {
            await WebsiteContent.create({
              websiteId,
              category: 'Hero',
              label: 'Hero Image',
              type: 'image[]',
              value: [uploaded.url],
            });
          }
          const cache = require('../../utils/cache');
          if (cache && cache.invalidateWebsiteCache) {
            await cache.invalidateWebsiteCache(websiteId);
          }
        }
      } catch (err) {
        console.warn('Failed to associate uploaded cover with website:', err);
      }
    }
    if (uploaded) return originalJson(uploaded);
    return originalJson(payload);
  };
  return exports.uploadProductImages(req, res);
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
