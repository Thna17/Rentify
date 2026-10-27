const multer = require('multer');
const service = require('./productImportService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: service.MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const csvType = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!csvType.includes(file.mimetype) && !/\.csv$/i.test(file.originalname || '')) {
      return callback(Object.assign(new Error('Only CSV files are accepted'), {
        statusCode: 415, code: 'CSV_TYPE_INVALID',
      }));
    }
    return callback(null, true);
  },
}).single('file');

const respond = (handler) => async (req, res) => {
  try { return await handler(req, res); }
  catch (error) {
    return res.status(error.statusCode || 500).json({
      error: { code: error.code || 'IMPORT_ERROR', message: error.message,
        retryable: !error.statusCode || error.statusCode >= 500 },
    });
  }
};

exports.upload = (req, res, next) => upload(req, res, (error) => {
  if (!error) return next();
  if (error.code === 'LIMIT_FILE_SIZE') {
    error.statusCode = 413;
    error.code = 'CSV_TOO_LARGE';
    error.message = 'CSV file exceeds the 5 MB limit';
  } else if (String(error.code || '').startsWith('LIMIT_')) {
    error.statusCode = 400;
    error.code = 'CSV_UPLOAD_INVALID';
    error.message = 'Attach exactly one CSV file in the file field';
  }
  return next(error);
});
exports.template = (_req, res) => {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="rentify-product-import-v${service.TEMPLATE_VERSION}.csv"`,
    'X-Rentify-Template-Version': service.TEMPLATE_VERSION,
  }).send(service.templateCsv());
};
exports.preview = respond(async (req, res) => {
  const job = await service.createPreview(req.store, req.file, req.get('Idempotency-Key'));
  return res.status(201).json({ job });
});
exports.list = respond(async (req, res) => res.json(await service.listJobs(req.store.storeId)));
exports.get = respond(async (req, res) => res.json({ job: await service.getJob(req.store.storeId, req.params.jobId) }));
exports.start = respond(async (req, res) =>
  res.status(202).json({ job: await service.markQueued(req.store.storeId, req.params.jobId) }));
exports.report = respond(async (req, res) => {
  const csv = await service.reportCsv(req.store.storeId, req.params.jobId);
  const safeJobId = String(req.params.jobId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'job';
  return res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="product-import-${safeJobId}-corrections.csv"`,
  }).send(csv);
});
exports.exportProducts = respond(async (req, res) => {
  const csv = await service.exportCsv(req.store.storeId);
  return res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="rentify-products.csv"',
  }).send(csv);
});
