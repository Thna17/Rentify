// tools/e2e/contractValidator.js - Validates API responses against accepted Core and Commerce OpenAPI contracts

const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./config');

function findModule(subPath) {
  const candidates = [
    path.resolve(ROOT_DIR, 'ecommerce-server/node_modules', subPath),
    path.resolve(ROOT_DIR, 'rentify-server/node_modules', subPath),
    path.resolve(ROOT_DIR, 'node_modules', subPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

const yaml = require(findModule('yaml'));

class ContractValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ContractValidationError';
    this.details = details;
  }
}

class OpenAPIContractValidator {
  constructor() {
    this.specs = {};
    this._loadSpecs();
  }

  _loadSpecs() {
    const corePath = path.join(ROOT_DIR, 'docs/openapi/core.openapi.yaml');
    const commercePath = path.join(ROOT_DIR, 'docs/openapi/commerce.openapi.yaml');

    if (fs.existsSync(corePath)) {
      this.specs.core = yaml.parse(fs.readFileSync(corePath, 'utf8'));
    }
    if (fs.existsSync(commercePath)) {
      this.specs.commerce = yaml.parse(fs.readFileSync(commercePath, 'utf8'));
    }
  }

  /**
   * Resolves a $ref pointer in an OpenAPI spec.
   */
  resolveRef(spec, ref) {
    if (!ref || !ref.startsWith('#/')) return null;
    const parts = ref.replace('#/', '').split('/');
    let current = spec;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return null;
      current = current[part];
    }
    return current;
  }

  /**
   * Validates a value against an OpenAPI schema.
   */
  validateSchema(spec, schema, data, pathName = '$') {
    if (!schema) return true;

    if (schema.$ref) {
      const resolved = this.resolveRef(spec, schema.$ref);
      if (!resolved) {
        throw new ContractValidationError(`Unresolvable $ref: ${schema.$ref} at ${pathName}`);
      }
      return this.validateSchema(spec, resolved, data, pathName);
    }

    // Handle anyOf / oneOf / allOf
    if (schema.oneOf) {
      const matches = schema.oneOf.filter((sub) => {
        try {
          return this.validateSchema(spec, sub, data, pathName);
        } catch {
          return false;
        }
      });
      if (matches.length === 0) {
        throw new ContractValidationError(`Value at ${pathName} did not match any oneOf schema`, { data });
      }
      return true;
    }

    if (schema.anyOf) {
      const matched = schema.anyOf.some((sub) => {
        try {
          return this.validateSchema(spec, sub, data, pathName);
        } catch {
          return false;
        }
      });
      if (!matched) {
        throw new ContractValidationError(`Value at ${pathName} did not match any anyOf schema`, { data });
      }
      return true;
    }

    // Nullability check
    if (data === null || data === undefined) {
      if (schema.nullable === true) return true;
      throw new ContractValidationError(`Value at ${pathName} cannot be null/undefined`, { schema, data });
    }

    // Type validation
    if (schema.type) {
      switch (schema.type) {
        case 'string':
          if (typeof data !== 'string') {
            throw new ContractValidationError(`Expected string at ${pathName}, got ${typeof data}`, { data });
          }
          if (schema.enum && !schema.enum.includes(data)) {
            throw new ContractValidationError(
              `Value "${data}" at ${pathName} is not in enum [${schema.enum.join(', ')}]`,
              { data, enum: schema.enum }
            );
          }
          break;

        case 'integer':
          if (!Number.isInteger(data)) {
            throw new ContractValidationError(`Expected integer at ${pathName}, got ${typeof data} (${data})`, { data });
          }
          break;

        case 'number':
          if (typeof data !== 'number' || Number.isNaN(data)) {
            throw new ContractValidationError(`Expected number at ${pathName}, got ${typeof data} (${data})`, { data });
          }
          break;

        case 'boolean':
          if (typeof data !== 'boolean') {
            throw new ContractValidationError(`Expected boolean at ${pathName}, got ${typeof data}`, { data });
          }
          break;

        case 'array':
          if (!Array.isArray(data)) {
            throw new ContractValidationError(`Expected array at ${pathName}, got ${typeof data}`, { data });
          }
          if (schema.items) {
            data.forEach((item, index) => {
              this.validateSchema(spec, schema.items, item, `${pathName}[${index}]`);
            });
          }
          break;

        case 'object':
          if (typeof data !== 'object' || Array.isArray(data)) {
            throw new ContractValidationError(`Expected object at ${pathName}, got ${typeof data}`, { data });
          }
          // Validate required properties
          if (Array.isArray(schema.required)) {
            for (const reqProp of schema.required) {
              if (data[reqProp] === undefined) {
                throw new ContractValidationError(
                  `Missing required property "${reqProp}" at ${pathName}`,
                  { required: schema.required, missing: reqProp, data }
                );
              }
            }
          }
          // Validate property schemas
          if (schema.properties) {
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
              if (data[propName] !== undefined) {
                if (data[propName] === null && (!Array.isArray(schema.required) || !schema.required.includes(propName))) {
                  continue;
                }
                this.validateSchema(spec, propSchema, data[propName], `${pathName}.${propName}`);
              }
            }
          }
          break;
      }
    }

    return true;
  }

  /**
   * Validates an API response against an operation in the OpenAPI spec.
   *
   * @param {string} service - 'core' or 'commerce'
   * @param {string} method - 'GET', 'POST', etc.
   * @param {string} pathTemplate - OpenAPI path template (e.g. '/api/stores/mine')
   * @param {number} statusCode - Actual HTTP status code
   * @param {any} body - Response payload
   * @param {object} headers - Response headers
   * @returns {{ valid: true, operationId: string }}
   */
  validateResponse(service, method, pathTemplate, statusCode, body, headers = {}) {
    const spec = this.specs[service];
    if (!spec) {
      throw new ContractValidationError(`OpenAPI specification for service "${service}" is not loaded.`);
    }

    const pathItem = spec.paths[pathTemplate];
    if (!pathItem) {
      throw new ContractValidationError(
        `Path "${pathTemplate}" not found in ${service} OpenAPI specification. Available paths: ${Object.keys(spec.paths).length}`
      );
    }

    const operation = pathItem[method.toLowerCase()];
    if (!operation) {
      throw new ContractValidationError(
        `Method "${method}" not defined for path "${pathTemplate}" in ${service} OpenAPI specification.`
      );
    }

    // 1. Verify correlation ID header is returned (Observability requirement)
    const correlationHeader =
      headers['x-correlation-id'] ||
      headers['X-Correlation-ID'] ||
      headers['x-request-id'] ||
      headers['X-Request-ID'];

    if (!correlationHeader && headers !== null && typeof headers === 'object' && Object.keys(headers).length > 0) {
      throw new ContractValidationError(
        `Response for ${method} ${pathTemplate} must include "x-correlation-id" header for distributed tracing.`,
        { headers }
      );
    }

    // 2. Locate response definition in OpenAPI
    const strStatus = String(statusCode);
    let responseDef = operation.responses[strStatus] || operation.responses['default'];

    if (!responseDef) {
      throw new ContractValidationError(
        `Unexpected status code ${statusCode} for ${method} ${pathTemplate}. Documented codes: [${Object.keys(operation.responses).join(', ')}]`,
        { statusCode, documented: Object.keys(operation.responses) }
      );
    }

    if (responseDef.$ref) {
      responseDef = this.resolveRef(spec, responseDef.$ref);
    }

    // 3. If response declares JSON content schema, validate the body
    const jsonContent = responseDef.content?.['application/json'];
    if (jsonContent?.schema && body !== undefined) {
      this.validateSchema(spec, jsonContent.schema, body, `${service}.${method}.${pathTemplate}.response`);
    }

    return {
      valid: true,
      service,
      operationId: operation.operationId,
      path: pathTemplate,
      statusCode,
    };
  }
}

module.exports = {
  OpenAPIContractValidator,
  ContractValidationError,
};
