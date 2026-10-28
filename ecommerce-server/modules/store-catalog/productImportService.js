const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const csv = require('csv-parser');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { Product, ProductVariant, ProductImportJob, StoreAccess } = require('../../models');
const { canonicalCategory } = require('../../config/marketplaceTaxonomy');
const storeCatalog = require('./storeCatalogService');
const { logger } = require('../../utils/logger');

const TEMPLATE_VERSION = '1.0';
const COLUMNS = ['name', 'description', 'marketplace_category', 'price', 'sku', 'stock_quantity'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const activeJobs = new Set();

function fail(message, statusCode = 400, code = 'IMPORT_INVALID') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function spreadsheetFormula(value) {
  return /^[\s\t\r\n]*[=+\-@]/.test(String(value || ''));
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (spreadsheetFormula(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvDocument(rows) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

function safeFilename(value) {
  const base = String(value || 'products.csv').split(/[\\/]/).pop();
  return base.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 255) || 'products.csv';
}

function issue(level, code, field, message) {
  return { level, code, field, message };
}

function validateRow(raw, number, duplicateSkus = new Set(), existingSkus = new Set()) {
  const value = {};
  for (const column of COLUMNS) value[column] = String(raw[column] ?? '').trim();
  const issues = [];
  for (const field of ['name', 'description', 'sku']) {
    if (value[field] && spreadsheetFormula(value[field])) {
      issues.push(issue('error', 'UNSAFE_SPREADSHEET_FORMULA', field,
        'Cell begins with a spreadsheet formula marker. Prefix intentional text with an apostrophe.'));
    }
  }
  if (!value.name || value.name.length > 200) {
    issues.push(issue('error', 'INVALID_NAME', 'name', 'Name is required and must be 200 characters or fewer.'));
  }
  if (value.description.length > 4000) {
    issues.push(issue('error', 'DESCRIPTION_TOO_LONG', 'description', 'Description must be 4000 characters or fewer.'));
  } else if (!value.description) {
    issues.push(issue('warning', 'DESCRIPTION_EMPTY', 'description', 'A description can help buyers understand the product.'));
  }
  const category = canonicalCategory(value.marketplace_category);
  if (!category) {
    issues.push(issue('error', 'INVALID_CATEGORY', 'marketplace_category', 'Choose a supported marketplace category.'));
  } else value.marketplace_category = category;
  const price = Number(value.price);
  if (!/^\d+(\.\d{1,2})?$/.test(value.price) || !Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    issues.push(issue('error', 'INVALID_PRICE', 'price', 'Price must be between 0.01 and 1,000,000 with at most two decimals.'));
  }
  const stock = Number(value.stock_quantity);
  if (!/^\d+$/.test(value.stock_quantity) || !Number.isSafeInteger(stock) || stock > 1_000_000) {
    issues.push(issue('error', 'INVALID_STOCK', 'stock_quantity', 'Stock must be a whole number from 0 to 1,000,000.'));
  } else if (stock === 0) {
    issues.push(issue('warning', 'ZERO_STOCK', 'stock_quantity', 'The draft will remain unavailable until stock is added.'));
  }
  const normalizedSku = value.sku.toUpperCase();
  if (!normalizedSku || normalizedSku.length > 120 || !/^[A-Z0-9][A-Z0-9._-]*$/.test(normalizedSku)) {
    issues.push(issue('error', 'INVALID_SKU', 'sku', 'SKU must use 1–120 letters, numbers, dots, underscores, or hyphens.'));
  } else if (duplicateSkus.has(normalizedSku)) {
    issues.push(issue('error', 'DUPLICATE_SKU_IN_FILE', 'sku', 'SKU is repeated in this file.'));
  } else if (existingSkus.has(normalizedSku)) {
    issues.push(issue('error', 'SKU_ALREADY_EXISTS', 'sku', 'SKU is already in use.'));
  }
  if (normalizedSku) duplicateSkus.add(normalizedSku);
  value.sku = normalizedSku;
  return {
    number,
    values: value,
    issues,
    state: issues.some((entry) => entry.level === 'error') ? 'invalid' : 'pending',
    productId: null,
    variantId: null,
  };
}

async function parseCsv(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) fail('Choose a non-empty CSV file', 400, 'CSV_REQUIRED');
  if (buffer.length > MAX_BYTES) fail('CSV file exceeds the 5 MB limit', 413, 'CSV_TOO_LARGE');
  const rawRows = [];
  let seenHeaders = [];
  try {
    await new Promise((resolve, reject) => {
      Readable.from([buffer])
      .pipe(csv({
        strict: true,
        mapHeaders: ({ header }) => String(header).replace(/^\uFEFF/, '').trim().toLowerCase(),
      }))
      .on('headers', (headers) => { seenHeaders = headers; })
      .on('data', (row) => {
        if (rawRows.length >= MAX_ROWS) {
          reject(Object.assign(new Error(`CSV may contain at most ${MAX_ROWS} rows`), {
            statusCode: 413, code: 'CSV_ROW_LIMIT',
          }));
          return;
        }
        rawRows.push(row);
      })
      .on('error', reject)
        .on('end', resolve);
    });
  } catch (error) {
    if (error.statusCode) throw error;
    fail('CSV could not be parsed. Check quotes, commas, and row column counts.', 400, 'CSV_PARSE_INVALID');
  }
  if (seenHeaders.length !== COLUMNS.length || COLUMNS.some((column, index) => seenHeaders[index] !== column)) {
    fail(`Use the version ${TEMPLATE_VERSION} template without changing its columns`, 400, 'CSV_HEADERS_INVALID');
  }
  if (!rawRows.length) fail('CSV must contain at least one product row', 400, 'CSV_EMPTY');
  return rawRows;
}

async function createPreview(store, file, idempotencyKey) {
  if (!/^[a-zA-Z0-9_.:-]{8,128}$/.test(String(idempotencyKey || ''))) {
    fail('A valid Idempotency-Key header is required', 400, 'IDEMPOTENCY_KEY_INVALID');
  }
  if (!file?.buffer) fail('Attach a CSV file in the file field', 400, 'CSV_REQUIRED');
  const sourceHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const prior = await ProductImportJob.findOne({ where: { storeId: store.storeId, idempotencyKey } });
  const replay = previewReplay(prior, sourceHash);
  if (replay) return replay;
  const rawRows = await parseCsv(file.buffer);
  const requestedSkus = rawRows.map((row) => String(row.sku || '').trim().toUpperCase()).filter(Boolean);
  const existing = await ProductVariant.findAll({
    where: { sku: { [Op.in]: requestedSkus } }, attributes: ['sku'], raw: true,
  });
  const existingSkus = new Set(existing.map((row) => String(row.sku).toUpperCase()));
  const duplicateSkus = new Set();
  const rows = rawRows.map((row, index) => validateRow(row, index + 2, duplicateSkus, existingSkus));
  const counts = countRows(rows);
  try {
    const job = await ProductImportJob.create({
      storeId: store.storeId,
      idempotencyKey,
      sourceHash,
      sourceFilename: safeFilename(file.originalname),
      templateVersion: TEMPLATE_VERSION,
      rows,
      totalRows: rows.length,
      validRows: counts.valid,
      warningRows: counts.warning,
      errorRows: counts.invalid,
    });
    return jobView(job, true);
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    const replay = await ProductImportJob.findOne({ where: { storeId: store.storeId, idempotencyKey } });
    if (!replay || replay.sourceHash !== sourceHash) fail('Idempotency conflict', 409, 'IDEMPOTENCY_CONFLICT');
    return jobView(replay, true);
  }
}

function normalizedRows(job) {
  const rows = typeof job.rows === 'string' ? JSON.parse(job.rows) : job.rows;
  return Array.isArray(rows) ? rows : [];
}

function countRows(rows) {
  return {
    valid: rows.filter((row) => row.state !== 'invalid').length,
    invalid: rows.filter((row) => row.state === 'invalid').length,
    warning: rows.filter((row) => row.issues.some((entry) => entry.level === 'warning')).length,
  };
}

function previewReplay(prior, sourceHash) {
  if (!prior) return null;
  if (prior.sourceHash !== sourceHash) {
    fail('Idempotency key was already used for a different file', 409, 'IDEMPOTENCY_CONFLICT');
  }
  return jobView(prior, true);
}

function nextPendingRow(rows) {
  return rows.findIndex((row) => row.state === 'pending');
}

function checkpointChanges(job, rows, imported) {
  return {
    rows,
    processedRows: job.processedRows + 1,
    ...(imported
      ? { importedRows: job.importedRows + 1 }
      : { failedRows: job.failedRows + 1 }),
  };
}

function jobView(job, includeRows = false) {
  const rows = normalizedRows(job);
  const data = {
    id: job.id,
    status: job.status,
    sourceFilename: job.sourceFilename,
    templateVersion: job.templateVersion,
    totalRows: job.totalRows,
    validRows: job.validRows,
    warningRows: job.warningRows,
    errorRows: job.errorRows,
    processedRows: job.processedRows,
    importedRows: job.importedRows,
    failedRows: job.failedRows,
    failureCode: job.failureCode,
    failureMessage: job.failureMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  };
  if (includeRows) data.rows = rows.slice(0, 100);
  data.previewTruncated = includeRows && rows.length > 100;
  return data;
}

async function listJobs(storeId) {
  const jobs = await ProductImportJob.findAll({
    where: { storeId }, order: [['createdAt', 'DESC']], limit: 25,
    attributes: { exclude: ['rows', 'sourceHash', 'idempotencyKey'] },
  });
  for (const job of jobs) {
    if (['queued', 'processing'].includes(job.status)) enqueue(job.id);
  }
  return { jobs: jobs.map((job) => jobView(job, false)) };
}

async function getJob(storeId, jobId) {
  const job = await ProductImportJob.findOne({ where: { id: jobId, storeId } });
  if (!job) fail('Import job not found', 404, 'IMPORT_JOB_NOT_FOUND');
  if (['queued', 'processing'].includes(job.status)) enqueue(job.id);
  return jobView(job, true);
}

async function markQueued(storeId, jobId) {
  const job = await ProductImportJob.findOne({ where: { id: jobId, storeId } });
  if (!job) fail('Import job not found', 404, 'IMPORT_JOB_NOT_FOUND');
  if (['completed', 'completed_with_errors'].includes(job.status)) return jobView(job, true);
  if (!['preview_ready', 'queued', 'processing', 'failed'].includes(job.status)) {
    fail('Import job cannot be started from its current state', 409, 'IMPORT_STATE_CONFLICT');
  }
  if (job.status === 'preview_ready' || job.status === 'failed') {
    await job.update({ status: 'queued', failureCode: null, failureMessage: null, completedAt: null });
  }
  enqueue(job.id);
  return jobView(job, true);
}

function enqueue(jobId) {
  if (activeJobs.has(jobId)) return;
  activeJobs.add(jobId);
  setImmediate(() => processJob(jobId)
    .catch((error) => logger.error('Product import job failed', { jobId, error }))
    .finally(() => activeJobs.delete(jobId)));
}

function runtimeIssue(error) {
  const safeCodes = new Set(['CAPABILITY_MUTATION_LOCKED', 'PRODUCT_LIMIT_EXCEEDED']);
  if (error.name === 'SequelizeUniqueConstraintError') {
    return issue('error', 'SKU_ALREADY_EXISTS', 'sku', 'SKU became unavailable before this row was imported.');
  }
  if (safeCodes.has(error.code)) return issue('error', error.code, 'row', error.message);
  if (error.statusCode && error.statusCode < 500) return issue('error', error.code || 'ROW_REJECTED', 'row', error.message);
  return null;
}

async function processOne(jobId) {
  return sequelize.transaction(async (transaction) => {
    const initial = await ProductImportJob.findByPk(jobId, { transaction });
    if (!initial) return { done: true };
    await StoreAccess.findByPk(initial.storeId, { transaction, lock: transaction.LOCK.UPDATE });
    const job = await ProductImportJob.findByPk(jobId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!job || !['queued', 'processing'].includes(job.status)) return { done: true };
    const rows = normalizedRows(job);
    const index = nextPendingRow(rows);
    if (index === -1) {
      const hasErrors = job.errorRows > 0 || job.failedRows > 0;
      await job.update({
        status: hasErrors ? 'completed_with_errors' : 'completed',
        completedAt: new Date(),
      }, { transaction });
      return { done: true };
    }
    if (job.status !== 'processing') {
      await job.update({ status: 'processing', startedAt: job.startedAt || new Date() }, { transaction });
    }
    const row = rows[index];
    const store = await StoreAccess.findByPk(job.storeId, { transaction });
    try {
      const { product, variant } = await sequelize.transaction({ transaction }, async (rowTransaction) => {
        const createdProduct = await storeCatalog.create(store, {
          name: row.values.name,
          sku: row.values.sku,
          description: row.values.description,
          price: Number(row.values.price),
          marketplaceCategory: row.values.marketplace_category,
          stockQuantity: Number(row.values.stock_quantity),
          status: 'draft',
          marketplaceVisibility: false,
          images: [],
        }, { transaction: rowTransaction, skipVariantCreation: true });
        const createdVariant = await ProductVariant.create({
          productId: createdProduct.id,
          sku: row.values.sku,
          price: Number(row.values.price).toFixed(2),
          stockQuantity: Number(row.values.stock_quantity),
          status: 'active',
        }, { transaction: rowTransaction });
        return { product: createdProduct, variant: createdVariant };
      });
      rows[index] = { ...row, state: 'imported', productId: product.id, variantId: variant.id };
      await job.update(checkpointChanges(job, rows, true), { transaction });
    } catch (error) {
      const rowIssue = runtimeIssue(error);
      if (!rowIssue) throw error;
      rows[index] = { ...row, state: 'failed', issues: [...row.issues, rowIssue] };
      await job.update(checkpointChanges(job, rows, false), { transaction });
    }
    return { done: false };
  });
}

async function processJob(jobId) {
  try {
    for (;;) {
      const result = await processOne(jobId);
      if (result.done) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
  } catch (error) {
    await ProductImportJob.update({
      status: 'failed', failureCode: 'IMPORT_INTERRUPTED',
      failureMessage: 'Import was interrupted. Retry to resume from the last committed row.',
    }, { where: { id: jobId } });
    throw error;
  }
}

function templateCsv() {
  return csvDocument([
    COLUMNS,
    ['Sample product', 'Replace or delete this example row', 'Other', '12.50', 'SAMPLE-001', '10'],
  ]);
}

async function reportCsv(storeId, jobId) {
  const job = await ProductImportJob.findOne({ where: { id: jobId, storeId } });
  if (!job) fail('Import job not found', 404, 'IMPORT_JOB_NOT_FOUND');
  const problemRows = normalizedRows(job).filter((row) => ['invalid', 'failed'].includes(row.state));
  return csvDocument([
    [...COLUMNS, 'row_number', 'severity', 'issue_codes', 'issue_messages'],
    ...problemRows.map((row) => [
      ...COLUMNS.map((column) => row.values[column]),
      row.number,
      row.issues.some((entry) => entry.level === 'error') ? 'error' : 'warning',
      row.issues.map((entry) => entry.code).join('|'),
      row.issues.map((entry) => entry.message).join(' | '),
    ]),
  ]);
}

async function exportCsv(storeId) {
  const products = await Product.findAll({
    where: { storeId },
    attributes: ['name', 'description', 'marketplaceCategory', 'price', 'stockQuantity', 'status'],
    include: [{
      model: ProductVariant, as: 'ProductVariants', required: false,
      attributes: ['sku', 'price', 'stockQuantity', 'status'],
    }],
    order: [['createdAt', 'ASC']],
  });
  const rows = [['name', 'description', 'marketplace_category', 'price', 'sku', 'stock_quantity', 'product_status', 'sku_status']];
  for (const product of products) {
    const variants = product.ProductVariants?.length ? product.ProductVariants : [null];
    for (const variant of variants) {
      rows.push([
        product.name, product.description || '', product.marketplaceCategory || '',
        variant?.price || product.price, variant?.sku || '',
        variant?.stockQuantity ?? product.stockQuantity, product.status, variant?.status || '',
      ]);
    }
  }
  return csvDocument(rows);
}

module.exports = {
  TEMPLATE_VERSION, COLUMNS, MAX_BYTES, MAX_ROWS,
  spreadsheetFormula, csvCell, validateRow, parseCsv, templateCsv,
  previewReplay, nextPendingRow, checkpointChanges,
  createPreview, listJobs, getJob, markQueued, processOne, processJob, reportCsv, exportCsv, jobView,
};
