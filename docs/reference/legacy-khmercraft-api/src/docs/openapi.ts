import { env } from '../config/env';

/**
 * OpenAPI 3.0 description of the KhmerCraft API.
 *
 * Kept as a typed object rather than JSDoc comments so the spec is one
 * readable document and cannot silently half-parse. When you add a route,
 * add its path here in the same PR.
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'KhmerCraft API',
    version: '0.1.0',
    description: [
      'Backend API for the KhmerCraft multi-vendor marketplace.',
      '',
      '**Authentication:** `POST /auth/login` sets an httpOnly cookie named',
      '`khmercraft_access` plus a rotating `khmercraft_refresh` cookie. Swagger UI',
      'sends them automatically on later requests,',
      'so log in first and protected endpoints will just work — there is no',
      'token to copy and paste.',
    ].join('\n'),
  },
  servers: [{ url: `http://localhost:${process.env.PORT ?? 3001}`, description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Auth', description: 'Buyer authentication and password management' },
    { name: 'Products', description: 'Product catalogue' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'khmercraft_access',
        description: 'JWT set automatically by /auth/login and /auth/register.',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6a686a5016178ee5e9f78649' },
          name: { type: 'string', example: 'Sok Dara' },
          email: { type: 'string', format: 'email', example: 'dara@example.com' },
          phone: { type: 'string', example: '+855 12 345 678' },
          role: { type: 'string', enum: ['BUYER', 'SELLER', 'ADMIN'], example: 'BUYER' },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Signed in successfully' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      MessageResponse: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Enter a valid email address' },
                  },
                },
              },
            },
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string', example: 'Handwoven Silk Scarf' },
          price: { type: 'number', example: 25 },
          category: { type: 'string', example: 'Textiles' },
          image: { type: 'string', example: 'https://example.com/scarf.jpg' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Request body failed validation',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Missing, expired, or invalid credentials',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        security: [],
        responses: {
          200: {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'KhmerCraft API' },
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a buyer account',
        description:
          'Creates a BUYER account and signs the user in immediately. The role is always BUYER — it cannot be set from the request body.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100, example: 'Sok Dara' },
                  email: { type: 'string', format: 'email', example: 'dara@example.com' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    maxLength: 72,
                    description: 'Must include a lowercase letter, an uppercase letter, and a number.',
                    example: 'Str0ngPass',
                  },
                  phone: { type: 'string', minLength: 8, maxLength: 30, example: '+855 12 345 678' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created; access and refresh cookies set',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          409: {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        description:
          'Authenticates a buyer or admin and sets access and rotating refresh cookies. Pass `expectedRole: "ADMIN"` for the admin sign-in screen so a buyer account cannot log in through it.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'dara@example.com' },
                  password: { type: 'string', example: 'Str0ngPass' },
                  expectedRole: { type: 'string', enum: ['BUYER', 'ADMIN'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Signed in; access and refresh cookies set',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the refresh token and renew the session',
        description:
          'Consumes the current httpOnly refresh cookie, revokes it, and issues a new access/refresh cookie pair. Reuse of a rotated token revokes the user’s remaining active refresh sessions.',
        security: [],
        responses: {
          200: {
            description: 'Session renewed and refresh token rotated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out',
        description:
          'Revokes the presented refresh token and clears both authentication cookies. Idempotent — safe to call when already signed out.',
        security: [],
        responses: {
          200: {
            description: 'Signed out',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } },
          },
        },
      },
    },

    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset link',
        description:
          'Always returns 200, even for an unknown email, so the endpoint cannot be used to discover which addresses are registered. In development the reset link is printed to the API server console.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email', example: 'dara@example.com' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Reset link created if the account exists',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set a new password using a reset token',
        description: 'The token is single-use and expires. Copy it from the reset link in the server console.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password', 'confirmPassword'],
                properties: {
                  token: { type: 'string', minLength: 32, maxLength: 256 },
                  password: { type: 'string', minLength: 8, maxLength: 72, example: 'N3wStr0ng' },
                  confirmPassword: { type: 'string', example: 'N3wStr0ng' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password reset',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } },
          },
          400: {
            description: 'Token invalid, expired, or already used',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/change-password': {
      patch: {
        tags: ['Auth'],
        summary: 'Change password while signed in',
        description: 'Requires a signed-in BUYER. The current password must be supplied even though the session is authenticated.',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'Str0ngPass' },
                  newPassword: { type: 'string', minLength: 8, maxLength: 72, example: 'Ev3nStr0nger' },
                  confirmPassword: { type: 'string', example: 'Ev3nStr0nger' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: 'Signed in but not a BUYER',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the signed-in user',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List all products',
        security: [],
        responses: {
          200: {
            description: 'Products, newest first',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product',
        description: 'Requires a SELLER or ADMIN access token.',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'price', 'category', 'image'],
                properties: {
                  title: { type: 'string', example: 'Handwoven Silk Scarf' },
                  price: { type: 'number', example: 25 },
                  category: { type: 'string', example: 'Textiles' },
                  image: { type: 'string', example: 'https://example.com/scarf.jpg' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Product created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: 'Signed in without the SELLER or ADMIN role',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          500: {
            description: 'Creation failed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
};

export const swaggerUiOptions = {
  customSiteTitle: 'KhmerCraft API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    withCredentials: true,
    docExpansion: 'list',
    tryItOutEnabled: true,
  },
};

export const isDocsEnabled = !env.isProduction;
