const cloudinary = require('cloudinary').v2;

const REQUIRED_ENV = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const configure = () => {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error('Image storage is not configured');
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const uploadBuffer = (buffer, { folder }) => {
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        transformation: [
          { width: 2400, height: 2400, crop: 'limit' },
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    stream.on('error', reject);
    stream.end(buffer);
  });
};

const verifyConnection = async () => {
  configure();
  await cloudinary.api.ping();
};

module.exports = { uploadBuffer, verifyConnection };
