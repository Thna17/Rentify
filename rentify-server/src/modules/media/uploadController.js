const cloudinary = require('cloudinary').v2;
const cloudinaryUploadService = require('./cloudinaryUploadService');
const { validateMediaStoreOwnership } = require('../../utils/mediaSecurityValidator');

cloudinaryUploadService.verifyConnection()
  .then(() => console.log('Cloudinary image storage is ready'))
  .catch((error) => console.warn(
    'Cloudinary image storage is unavailable:',
    error.code === 'CLOUDINARY_NOT_CONFIGURED' ? 'credentials are not configured' : 'credential or network check failed'
  ));

const resolveStoreId = async (req) => {
  if (req.store?.id) return req.store.id;
  if (req.website?.storeId) return req.website.storeId;

  const { Store, Website } = require('../../models');

  if (req.website?.userId) {
    const store = await Store.findOne({ where: { ownerUserId: req.website.userId } });
    if (store) {
      req.website.storeId = store.id;
      return store.id;
    }
  }

  const websiteId = req.params?.websiteId || req.body?.websiteId;
  if (websiteId) {
    const website = await Website.findByPk(websiteId);
    if (website?.storeId) return website.storeId;
    if (website?.userId) {
      const store = await Store.findOne({ where: { ownerUserId: website.userId } });
      if (store) return store.id;
    }
  }

  const storeId = req.params?.storeId || req.body?.storeId;
  if (storeId) {
    const store = await Store.findByPk(storeId);
    if (store) return store.id;
  }

  if (req.user?.id) {
    const store = await Store.findOne({ where: { ownerUserId: req.user.id } });
    if (store) return store.id;
    if (req.user.merchantId) {
      const merchantStore = await Store.findOne({ where: { ownerUserId: req.user.merchantId } });
      if (merchantStore) return merchantStore.id;
    }
  }

  return null;
};

const uploadFolder = async (req) => {
  const storeId = await resolveStoreId(req);
  if (!storeId) {
    const error = new Error('Store context required for media upload');
    error.statusCode = 403;
    throw error;
  }
  let category = 'products';
  if (req.query?.isLogo === 'true' || req.query?.type === 'logo') {
    category = 'logo';
  } else if (req.query?.type === 'cover' || req.baseUrl?.includes('websites')) {
    category = 'website';
  }
  return `rentify/stores/${storeId}/${category}`;
};

function extractPublicId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();
  if (!trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }
  const match = trimmed.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : trimmed;
}

const respondToUploadError = (res, error) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
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
    const folder = await uploadFolder(req);
    const images = await Promise.all(
      files.map((file) => cloudinaryUploadService.uploadBuffer(file.buffer, { folder }))
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

exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const storeId = await resolveStoreId(req);
    if (!storeId) {
      return res.status(403).json({ error: 'Store context required for PDF upload' });
    }

    // Validate configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary configuration is missing');
    }

    const result = await new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'raw',
        folder: `rentify/stores/${storeId}/invoices`,
        allowed_formats: ['pdf'],
        timeout: 60000,
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
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('PDF upload error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error.message.includes('ENOTFOUND') || error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        details: 'Cannot connect to file service',
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

exports.deleteMedia = async (req, res) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      return res.status(403).json({ error: 'Store context required for media deletion' });
    }

    const target = req.body?.publicId || req.body?.url || req.query?.publicId || req.query?.url;
    if (!target || typeof target !== 'string' || !target.trim()) {
      return res.status(400).json({ error: 'Target publicId or url is required' });
    }

    // 1. Cross-store reference check: if it points to another store's folder, reject 403
    validateMediaStoreOwnership(target, storeId);

    // 2. Strict store ownership: target must belong to rentify/stores/${storeId}/
    const publicId = extractPublicId(target);
    const expectedPrefix = `rentify/stores/${storeId}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return res.status(403).json({ error: 'Media does not belong to your store' });
    }

    const result = await cloudinaryUploadService.destroyPublicId(publicId);
    return res.json({ success: true, result });
  } catch (error) {
    return respondToUploadError(res, error);
  }
};

exports.uploadFolder = uploadFolder;
exports.resolveStoreId = resolveStoreId;
exports.extractPublicId = extractPublicId;
exports.respondToUploadError = respondToUploadError;
