# Media Store Ownership Audit (P2-AUTHZ-002)

**Status**: Verified & Enforced  
**Slice**: P2-AUTHZ-002 (Media Slice)  
**Authority**: `rentify-server` & `ecommerce-server`  
**Date**: October 23, 2026  
**Target Invariant**: Strict Pre-Upload Authentication, Canonical Store Isolation, Magic Byte Validation, Path Traversal Defense, Cross-Store Media Guessing Prevention, Safe Media Deletions  

---

## 1. Executive Summary

This audit establishes authoritative ownership rules and runtime access control enforcement for all active media operations in Rentify's platform, spanning store logos, product images, website assets, document/catalogue PDFs, CSV catalog imports, and media deletions.

In accordance with Phase 2 requirements (P2-AUTHZ-002: Media Slice):
- **Pre-Upload Subject Authentication**: Every upload endpoint executes authentication and store/website authorization middleware *before* multer middleware reads, buffers, or writes any multipart file data. Unauthenticated or unauthorized callers are rejected immediately with `401` or `403` prior to consuming memory or disk resources.
- **Store-Partitioned Storage Namespace**: All store-related media assets are strictly stored under `rentify/stores/${storeId}/${category}`, where `storeId` is the canonical Store identifier verified server-side.
- **Channel Decoupling**: Websites serve as optional channel context, never as merchant identity or storage root. Media uploaded in website context resolves to the website's backing `Store` (`website.storeId`).
- **Client Storage Path Tamper Resistance**: Clients cannot specify arbitrary storage paths, folders, or public IDs via query parameters or request body fields (`folder`, `path`, `public_id`, `publicId`). Server-side path generation strictly controls the Cloudinary folder.
- **Deep File Signature (Magic Byte) Inspection**: Uploaded buffers are validated against known magic byte signatures for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), GIF (`GIF8`), WebP (`RIFF...WEBP`), and PDF (`%PDF`). Polyglots, executable binaries (PE/MZ, ELF, Mach-O, ZIP), and embedded text scripts (`<?php`, `<script>`, `<svg>`, `#!/bin/`, `eval(`) are rejected with `400 Bad Request`.
- **Filename Sanitization & Path Traversal Prevention**: Filenames are sanitized with `path.basename`, backslashes are normalized, null bytes are stripped, and unsafe characters are replaced. Disk uploads in `ecommerce-server` use cryptographically isolated stems with strictly enforced extensions.
- **Cross-Store Media Reference Guessing Prevention**: Cross-store media references (e.g. attempting to update a store's logo or product images with a URL pointing to another store's `rentify/stores/${otherStoreId}/` folder) are rejected with `403 Cross-store media reference prohibited`.
- **Media Deletion Authorization**: Media deletion endpoints verify that the target media record belongs strictly to the authenticated caller's store namespace (`rentify/stores/${storeId}/`). Attempts to delete media from other stores or root namespaces are rejected with `403`.
- **Credential & Internal Path Protection**: Private Cloudinary credentials, internal filesystem paths, and storage secrets are never exposed in responses or logs.

---

## 2. Media Route Inventory

| Route | Method | Server | Primary Asset Type | Auth Gate Order | Storage Path / Namespace | Required Actor | Denial Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/stores/mine/logo` | `POST` | `rentify-server` | Store Logo Image | `requireOwnStoreOwner` -> `storeLogoUpload` | `rentify/stores/${storeId}/logo` | Store Owner | `401` / `403` / `400` |
| `/api/stores/:storeId/product-images` | `POST` | `rentify-server` | Product Images (up to 10) | `requireStoreAccess` -> `productImagesUpload` | `rentify/stores/${storeId}/products` | Store Owner / Permitted Staff (`products`, `manage_products`) | `401` / `403` / `400` |
| `/api/stores/mine/media` | `DELETE` | `rentify-server` | Any Store Media Asset | `requireOwnStoreOwner` -> `deleteMedia` | Verified `rentify/stores/${storeId}/` prefix | Store Owner | `401` / `403` / `400` |
| `/api/stores/:storeId/media` | `DELETE` | `rentify-server` | Any Store Media Asset | `requireStoreAccess` -> `deleteMedia` | Verified `rentify/stores/${storeId}/` prefix | Store Owner / Permitted Staff | `401` / `403` / `400` |
| `/api/websites/uploadImage/:websiteId` | `POST` | `rentify-server` | Storefront Logo / Banner Cover | `verifyToken` -> `requireWebsiteOwner` -> `singleImageUpload` | `rentify/stores/${storeId}/logo` or `website` | Storefront Website Owner | `401` / `403` / `400` |
| `/api/websites/:websiteId/product-images` | `POST` | `rentify-server` | Product Images via Storefront | `verifyToken` -> `requireWebsiteOwner` -> `productImagesUpload` | `rentify/stores/${storeId}/products` | Storefront Website Owner | `401` / `403` / `400` |
| `/api/websites/upload-pdf/:websiteId` | `POST` | `rentify-server` | Catalogue / Invoice PDF | `verifyToken` -> `requireWebsiteOwner` -> `singlePdfUpload` | `rentify/stores/${storeId}/invoices` | Storefront Website Owner | `401` / `403` / `400` |
| `/api/websites/:websiteId/media` | `DELETE` | `rentify-server` | Website Media Asset | `verifyToken` -> `requireWebsiteOwner` -> `deleteMedia` | Verified `rentify/stores/${storeId}/` prefix | Storefront Website Owner | `401` / `403` / `400` |
| `/:websiteId/bulk-csv` | `POST` | `ecommerce-server` | Bulk Product CSV | `verifyToken` -> `requireWebsitePermission` -> `upload.single` | `uploads/products-<ts>-<stem>.csv` (sanitized temporary disk) | Permitted Merchant / Staff (`products`, `manage_products`) | `401` / `403` / `400` |

---

## 3. Pre-Upload Authentication Architecture

### 3.1 Defense-in-Depth Middleware Ordering
In Node.js Express applications, placing multipart parsing middleware (e.g. `multer`) before authentication middleware creates an Denial of Service (DoS) vulnerability: an attacker without credentials could flood the server with multi-gigabyte streams, consuming memory or filling disk partitions before authentication is evaluated.

To enforce the pre-upload authentication invariant:
1. `rentify-server/src/modules/stores/storeRoutes.js`:
   ```javascript
   // Auth verification and Store ownership precede multer parsing
   router.post('/mine/logo', requireOwnStoreOwner, storeLogoUpload, controller.uploadOwnLogo);
   router.post('/:storeId/product-images', requireStoreAccess, productImagesUpload, uploadProductImages);
   ```
2. `rentify-server/src/modules/websites/websiteRoutes.js`:
   ```javascript
   // Auth verification and Website ownership precede multer parsing
   router.post('/uploadImage/:websiteId', verifyToken, requireWebsiteOwner, singleImageUpload('image'), uploadImage);
   router.post('/:websiteId/product-images', verifyToken, requireWebsiteOwner, productImagesUpload, uploadProductImages);
   router.post('/upload-pdf/:websiteId', verifyToken, requireWebsiteOwner, singlePdfUpload, uploadPDF);
   ```
3. `ecommerce-server/modules/catalog/productRoutes.js`:
   ```javascript
   router.post("/:websiteId/bulk-csv",
     verifyToken,
     requireWebsitePermission(["products", "manage_products"]),
     ProductController.upload.single('file'),
     ProductController.bulkCreateFromCSV
   );
   ```

Any unauthenticated request returns `401 Unauthorized` before a single byte of file data is buffered or parsed.

---

## 4. File Security & Upload-Abuse Defenses

### 4.1 Magic Number Verification
Content-Type headers sent by clients cannot be trusted. The `mediaSecurityValidator` utility performs deep byte inspections:
- **JPEG**: Evaluates initial bytes for SOI marker `[0xFF, 0xD8, 0xFF]`.
- **PNG**: Evaluates 8-byte magic sequence `[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]`.
- **GIF**: Evaluates `[0x47, 0x49, 0x46, 0x38]` (`GIF8`).
- **WebP**: Evaluates RIFF header at offset 0 and WEBP marker at offset 8.
- **PDF**: Evaluates `[0x25, 0x50, 0x44, 0x46]` (`%PDF`).

### 4.2 Executable & Polyglot Rejection
Binary headers are scanned for DOS/PE (`[0x4D, 0x5A]`), Linux ELF (`[0x7F, 0x45, 0x4C, 0x46]`), Mach-O (`[0xCA, 0xFE, 0xBA, 0xBE]`), and ZIP archives.
Additionally, the initial 1024 bytes are inspected for embedded text scripts:
`<?php`, `<script`, `<svg`, `<html`, `#!/bin/`, `#!/usr/`, and `eval(`. Any match immediately halts upload with `400 Dangerous or executable file content detected`.

### 4.3 Safe Filename Normalization
Filename sanitization strips null bytes (`\0`), replaces Windows backslashes with forward slashes, invokes `path.basename`, normalizes non-alphanumeric characters to safe underscores, and strips leading dots or dashes.

---

## 5. Cross-Store Isolation & Deletion Boundaries

### 5.1 Cloudinary Namespace Structure
Every uploaded file is stored deterministically:
```
rentify/stores/<storeId>/products/
rentify/stores/<storeId>/logo/
rentify/stores/<storeId>/website/
rentify/stores/<storeId>/invoices/
```

### 5.2 Reference Guessing Prevention
When a merchant updates their store logo or product images:
1. `rentify-server/src/modules/stores/storeService.js`:
   ```javascript
   if (changes.logoUrl) {
     validateMediaStoreOwnership(changes.logoUrl, store.id);
   }
   ```
2. `ecommerce-server/modules/store-catalog/storeCatalogService.js`:
   ```javascript
   function validateImages(value, storeId) {
     if (storeId) {
       for (const image of value) {
         const match = image.url.match(/rentify\/stores\/([a-zA-Z0-9-]+)\//i);
         if (match && match[1] !== storeId) {
           fail('Cross-store media reference prohibited', 403);
         }
       }
     }
     return value.map((image) => ({ url: image.url }));
   }
   ```
3. `rentify-server/src/modules/websites/storefrontContentFields.js`:
   ```javascript
   const clean = urls.map((u) => safeImageUrl(u, storeId));
   if (clean.some((url) => url === false)) {
     errors.push({ label, message: 'Cross-store media reference prohibited' });
   }
   ```

### 5.3 Authoritative Media Deletions
Media deletion requests (`DELETE /api/stores/mine/media`, `DELETE /api/stores/:storeId/media`, `DELETE /api/websites/:websiteId/media`) require:
1. Valid store ownership or permitted staff membership.
2. The target publicId / URL must match the regex `rentify/stores/${storeId}/`.
3. Requests referencing any other store's media or arbitrary root paths are denied with `403 Media does not belong to your store`.

---

## 6. Verification & Test Evidence

### 6.1 Test Suites Executed
1. `rentify-server/test/security/mediaStoreOwnership.test.js` (13 tests):
   - Magic number detection and polyglot rejection.
   - Executable PE/ELF/Mach-O and script injection rejection.
   - Filename sanitization and path traversal defense.
   - Content-Type / magic byte mismatch detection.
   - Cross-store media reference rejection (`403`).
   - Store media folder generation.
   - Cloudinary upload folder tamper resistance (ignoring client-injected paths).
   - Media deletion store ownership verification.
   - Actor matrix pre-upload table (owner, permitted staff, unpermitted staff, unrelated merchant, suspended store, public).
   - Storefront content media isolation.
2. `ecommerce-server/test/security/mediaStoreOwnership.test.js` (3 tests):
   - Multer diskStorage path traversal sanitization in CSV uploads.
   - CSV fileFilter rejection of executable and image extensions.
   - Cross-store product image reference rejection in store catalog service.
3. `rentify-server/test/security/openApiContract.test.js`:
   - Validated that all new DELETE media endpoints are covered in `docs/openapi/core.openapi.yaml`.

---

## 7. Audit Sign-Off

- **Pre-Upload Authentication**: Guaranteed.
- **Store Ownership Resolution**: Independent of Website context.
- **Cross-Store Guessing**: Prohibited across Core, Commerce, and Storefronts.
- **Storage Provider Behavior**: Cloudinary and local disk providers preserved without regression.
- **Zero Secrets Excluded**: No internal paths or storage credentials exposed.
- **Status**: PASSED.
