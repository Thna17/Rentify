// controllers/ProductController.js
const { sequelize } = require('../config/db');
const ProductService = require('../services/ProductService');
const { ApiError } = require('../utils/ApiError');
const { logger } = require('../utils/logger');
const { Op } = require('sequelize'); 
const { Product } = require('../models');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `products-${Date.now()}-${file.originalname}`);
  }
});


const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
class ProductController {
  static async getAllProducts(req, res) {
    try {
      const { websiteId } = req.params;
      const service = new ProductService(websiteId);
      const result = await service.findAll({ ...req.query, status: 'active', limit: Math.min(60, Number(req.query.limit) || 12) });
      res.json(result);
    } catch (error) {
    logger.error('Get all products error:', error);
    const statusCode = error.statusCode || 500;
    const message = error instanceof ApiError ? error.message : 'Server error';
    
    res.status(statusCode).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
    }
  }

  static async getManagedProducts(req, res) {
    try {
      const service = new ProductService(req.params.websiteId);
      const result = await service.findAll({ ...req.query, status: req.query.status || 'all',
        limit: Math.min(60, Number(req.query.limit) || 12) });
      res.json(result);
    } catch (error) {
      logger.error('Get managed products error:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Server error' });
    }
  }

  static async getManagedProductById(req, res) {
    try {
      const service = new ProductService(req.params.websiteId);
      res.json(await service.findById(req.params.productId));
    } catch (error) {
      logger.error('Get managed product error:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Server error' });
    }
  }

  static async getProductBySlug(req, res) {
    try {
      const { websiteId, slug } = req.params;
      const service = new ProductService(websiteId);
      const product = await service.findBySlug(slug);
      if (product.status !== 'active') return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (error) {
      logger.error('Get product by slug error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async getProductById(req, res) {
    try {
      const { websiteId, productId } = req.params;
      const service = new ProductService(websiteId);
      const product = await service.findById(productId);
      if (product.status !== 'active') return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (error) {
      logger.error('Get product by ID error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async createProduct(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId } = req.params;
      const service = new ProductService(websiteId);
      const product = await service.create(req.body, transaction);
      
      await transaction.commit();
      res.status(201).json(product);
    } catch (error) {
      await transaction.rollback();
      logger.error('Create product error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async updateProduct(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId, productId } = req.params;
      const service = new ProductService(websiteId);
      const product = await service.update(productId, req.body, transaction);
      
      await transaction.commit();
      res.json(product);
    } catch (error) {
      await transaction.rollback();
      logger.error('Update product error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async deleteProduct(req, res) {
      const transaction = await sequelize.transaction(); 
    try {
      const { websiteId, productId } = req.params;
      const { expectedVersion } = req.body;
      
      const service = new ProductService(websiteId);
    await service.delete(productId, expectedVersion, transaction);
      
        await transaction.commit();
      res.status(204).send();
    } catch (error) {
          await transaction.rollback();
      logger.error('Delete product error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async getRecommendedOptions(req, res) {
    try {
      const { websiteId } = req.params;
      const { productType } = req.query;
      
      const service = new ProductService(websiteId);
      const options = await service.getRecommendedOptions(productType);
      
      res.json(options);
    } catch (error) {
      logger.error('Get recommended options error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

   static async getProductsByCategory(req, res) {
    try {
      const { websiteId } = req.params;
      const { categoryId, ...queryParams } = req.query;
      
      const service = new ProductService(websiteId);
      const result = await service.getProductsByCategory({
        categoryId,
        ...queryParams,
        status: 'active',
      });
      
      res.json(result);
    } catch (error) {
      logger.error('Get products by category error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async createBulkProducts(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId } = req.params;
      const { products } = req.body;

      if (!products || !Array.isArray(products)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Products array is required' });
      }

      const service = new ProductService(websiteId);
      const createdProducts = await service.createBulkProducts(products, transaction);
      
      await transaction.commit();
      res.status(201).json({
        count: createdProducts.length,
        products: createdProducts
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Bulk create products error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async updateInventory(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId, productId } = req.params;
      const { quantity, note, expectedVersion } = req.body;

      const service = new ProductService(websiteId);
      const updatedProduct = await service.updateInventory(
        productId, 
        { quantity, note, expectedVersion }, 
        transaction
      );
      
      await transaction.commit();
      res.json(updatedProduct);
    } catch (error) {
      await transaction.rollback();
      logger.error('Update inventory error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async bulkUpdateProducts(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId } = req.params;
      const { productIds, operation, expectedVersions, ...updateData } = req.body;

      const service = new ProductService(websiteId);
      const result = await service.bulkUpdateProducts(
        { productIds, operation, expectedVersions, ...updateData },
        transaction
      );
      
      await transaction.commit();
      res.json({
        message: `${operation} completed successfully`,
        ...result
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Bulk update products error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async bulkCreateFromCSV(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId } = req.params;

      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const csvData = await ProductController.parseCSVFile(req.file.path);
      const service = new ProductService(websiteId);
      const importedProducts = await service.importFromCSV(csvData, transaction);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      await transaction.commit();
      res.status(201).json({
        count: importedProducts.length,
        products: importedProducts,
        message: 'CSV import completed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      
      // Clean up file on error
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('Bulk CSV import error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }


static parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let rowCount = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        rowCount++;
        if (rowCount > 1000) { // Limit to 1000 rows
          reject(new ApiError(400, 'CSV file too large. Maximum 1000 rows allowed.'));
          return;
        }
        results.push(data);
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new ApiError(400, 'CSV file is empty'));
          return;
        }
        resolve(results);
      })
      .on('error', (error) => reject(error));
  });
}

  static async getProductAnalytics(req, res) {
    try {
      const { websiteId } = req.params;
      const service = new ProductService(websiteId);
      const analytics = await service.getProductAnalytics();
      
      res.json(analytics);
    } catch (error) {
      logger.error('Get product analytics error:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Server error' 
      });
    }
  }

  static async searchProducts(req, res) {
    try {
      const { websiteId } = req.params;
      const { q, field = 'all', limit = 10 } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const service = new ProductService(websiteId);
      const where = { websiteId: websiteId, status: 'active' };

      // Build search conditions based on field
      if (field === 'all' || field === 'name') {
        where.name = { [Op.like]: `%${q}%` };
      } else if (field === 'sku') {
        where.sku = { [Op.like]: `%${q}%` };
      } else if (field === 'tags') {
        where.tags = { [Op.like]: `%${q}%` };
      }

      const products = await Product.findAll({
        where,
        limit: parseInt(limit),
        attributes: ['id', 'name', 'sku', 'price', 'status', 'images'],
        order: [['name', 'ASC']]
      });

      res.json({
        query: q,
        field,
        results: products
      });
    } catch (error) {
      logger.error('Search products error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
}
ProductController.upload = upload;

module.exports = ProductController;
