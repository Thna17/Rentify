// src/utils/mediaSecurityValidator.js
// Authoritative security validator for media uploads, MIME/magic byte checks,
// path traversal defense, and cross-store media reference isolation.

const path = require('node:path');

const MAGIC_NUMBERS = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  gif: [0x47, 0x49, 0x46, 0x38], // 'GIF8'
  webpRiff: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
  webpWebp: [0x57, 0x45, 0x42, 0x50], // 'WEBP'
  pdf: [0x25, 0x50, 0x44, 0x46], // '%PDF'
};

const EXECUTABLE_SIGNATURES = [
  [0x4D, 0x5A], // MZ (DOS/PE executable)
  [0x7F, 0x45, 0x4C, 0x46], // ELF (Linux executable)
  [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O / Java class
  [0x50, 0x4B, 0x03, 0x04], // ZIP archive
];

const DISALLOWED_EXTENSIONS = new Set([
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
  '.exe', '.dll', '.so', '.sh', '.bash', '.bat', '.cmd', '.ps1',
  '.js', '.mjs', '.cjs', '.ts', '.py', '.rb', '.pl', '.cgi',
  '.html', '.htm', '.xhtml', '.svg', '.xml', '.jsp', '.asp', '.aspx',
  '.jar', '.war', '.vbs', '.scr', '.hta',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function normalizeImageMime(mime) {
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime;
}

function matchesBytes(buffer, bytes, offset = 0) {
  if (!buffer || buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function detectBufferType(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return null;

  if (matchesBytes(buffer, MAGIC_NUMBERS.jpeg)) return 'image/jpeg';
  if (matchesBytes(buffer, MAGIC_NUMBERS.png)) return 'image/png';
  if (matchesBytes(buffer, MAGIC_NUMBERS.gif)) return 'image/gif';
  if (matchesBytes(buffer, MAGIC_NUMBERS.webpRiff) && matchesBytes(buffer, MAGIC_NUMBERS.webpWebp, 8)) {
    return 'image/webp';
  }
  if (matchesBytes(buffer, MAGIC_NUMBERS.pdf)) return 'application/pdf';

  return null;
}

function hasDangerousContent(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return false;

  // Check known executable signatures
  for (const sig of EXECUTABLE_SIGNATURES) {
    if (matchesBytes(buffer, sig)) return true;
  }

  // Scan initial bytes for embedded text scripts
  const header = buffer.slice(0, 1024).toString('utf8').toLowerCase();
  if (
    header.includes('<?php') ||
    header.includes('<script') ||
    header.includes('<svg') ||
    header.includes('<html') ||
    header.includes('#!/bin') ||
    header.includes('#!/usr') ||
    header.includes('eval(')
  ) {
    return true;
  }

  return false;
}

function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== 'string') return 'upload.bin';
  // Strip null bytes and control characters
  let cleaned = originalName.replace(/\0/g, '').trim();
  // Normalize Windows backslash separators
  cleaned = cleaned.replace(/\\/g, '/');
  // Strip path traversal attempts and directory separators
  cleaned = path.basename(cleaned);
  // Keep only safe characters: alphanumeric, dots, underscores, dashes
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Strip leading dots or dashes
  cleaned = cleaned.replace(/^[.-]+/, '');
  return cleaned || 'upload.bin';
}

function validateImageFile(file) {
  if (!file) {
    const err = new Error('Choose an image');
    err.statusCode = 400;
    throw err;
  }

  const safeName = sanitizeFilename(file.originalname);
  const ext = path.extname(safeName).toLowerCase();

  // 1. Extension check
  if (DISALLOWED_EXTENSIONS.has(ext) || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    const err = new Error('Use a JPG, PNG, WebP, or GIF image');
    err.statusCode = 400;
    throw err;
  }

  // 2. Client-declared MIME check
  if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
    const err = new Error('Use a JPG, PNG, WebP, or GIF image');
    err.statusCode = 400;
    throw err;
  }

  // 3. Inspect buffer magic bytes (do not trust Content-Type alone)
  if (file.buffer) {
    if (hasDangerousContent(file.buffer)) {
      const err = new Error('Dangerous or executable file content detected');
      err.statusCode = 400;
      throw err;
    }

    const detectedMime = detectBufferType(file.buffer);
    const clientMime = normalizeImageMime(file.mimetype);
    if (!detectedMime || !ALLOWED_IMAGE_MIMES.has(detectedMime) || (clientMime && detectedMime !== clientMime)) {
      const err = new Error('File content does not match image format (signature mismatch)');
      err.statusCode = 400;
      throw err;
    }
  }

  file.originalname = safeName;
  return true;
}

function validatePdfFile(file) {
  if (!file) {
    const err = new Error('No PDF file uploaded');
    err.statusCode = 400;
    throw err;
  }

  const safeName = sanitizeFilename(file.originalname);
  const ext = path.extname(safeName).toLowerCase();

  if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
    const err = new Error('Only PDF files are allowed!');
    err.statusCode = 400;
    throw err;
  }

  if (file.buffer) {
    if (hasDangerousContent(file.buffer) || !matchesBytes(file.buffer, MAGIC_NUMBERS.pdf)) {
      const err = new Error('File content is not a valid PDF document');
      err.statusCode = 400;
      throw err;
    }
  }

  file.originalname = safeName;
  return true;
}

function validateMediaStoreOwnership(urlOrPublicId, expectedStoreId) {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return true;
  if (!expectedStoreId) return true;

  // Enforce tenant prefix rentify/stores/:storeId/
  const match = urlOrPublicId.match(/rentify\/stores\/([a-zA-Z0-9-]+)\//i);
  if (match) {
    const referencedStoreId = match[1];
    if (referencedStoreId !== expectedStoreId) {
      const err = new Error('Cross-store media reference prohibited');
      err.statusCode = 403;
      throw err;
    }
  }
  return true;
}

function getStoreMediaFolder(storeId, category = 'products') {
  if (!storeId || typeof storeId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(storeId)) {
    throw new Error('Valid store ID is required for media folder generation');
  }
  const cleanCategory = String(category).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `rentify/stores/${storeId}/${cleanCategory || 'products'}`;
}

module.exports = {
  detectBufferType,
  hasDangerousContent,
  sanitizeFilename,
  validateImageFile,
  validatePdfFile,
  validateMediaStoreOwnership,
  getStoreMediaFolder,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIMES,
};
