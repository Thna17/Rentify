import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import {
  isDocsEnabled,
  openApiDocument,
  swaggerUiOptions,
} from './docs/openapi';
import { errorHandler, notFound } from './middleware/error-handler';
import {
  apiRateLimit,
  preventOperatorInjection,
} from './middleware/security';
import { AppError } from './errors/app-error';
import authRoutes from './modules/auth/auth.routes';
import cartRoutes from './modules/cart/cart.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import taxonomyRoutes from './modules/catalog/taxonomy.routes';
import orderRoutes from './modules/orders/orders.routes';
import paymentRoutes from './modules/payments/payments.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import sellerRoutes from './modules/sellers/sellers.routes';
import storeCategoryRoutes from './modules/store-categories/store-categories.routes';

export const createApp = () => {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'Origin is not allowed', 'CORS_REJECTED'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  // 6mb covers the seller dashboard's base64 product-image uploads (see
  // catalog.validation.ts, which caps a single image string at 5MB) plus
  // request overhead; a larger ceiling only widens the memory-exhaustion
  // surface for no real payload this API accepts.
  app.use(express.json({ limit: '6mb' }));
  // PayWay's webhook can arrive form-encoded rather than as JSON.
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(preventOperatorInjection);
  app.use(apiRateLimit);

  app.get('/', (_request, response) => {
    response.json({ name: 'KhmerCraft API', status: 'ok' });
  });

  /**
   * Liveness: is the process up and serving? Deliberately does not touch the
   * database — a restart loop caused by a slow database helps nobody.
   */
  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Readiness: should this instance receive traffic? Reports the Mongo
   * connection, and answers 503 when it cannot serve, so a load balancer
   * drains it instead of sending requests that are certain to fail.
   */
  app.get('/ready', (_request, response) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const state = mongoose.connection.readyState;
    const ready = state === 1;

    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not-ready',
      database: states[state] ?? 'unknown',
    });
  });
  // Auth stays at /auth for backwards compatibility with the web client that
  // is already deployed against it; commerce is namespaced under /api.
  // TODO(api-prefix): fold /auth into /api/auth once the web client can be
  // updated in the same release.
  app.use('/auth', authRoutes);
  app.use('/api/products', catalogRoutes);
  // Reference data the storefront navigates by.
  app.use('/api', taxonomyRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/sellers', sellerRoutes);
  app.use('/api/store-categories', storeCategoryRoutes);

  // Interactive API docs. Disabled in production so the schema is not public.
  if (isDocsEnabled) {
    app.get('/api-docs.json', (_request, response) => {
      response.json(openApiDocument);
    });
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, swaggerUiOptions),
    );
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
