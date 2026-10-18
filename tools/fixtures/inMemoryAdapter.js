// tools/fixtures/inMemoryAdapter.js - In-memory Sequelize model adapter for hermetic, database-free testing

function matchesCondition(recordValue, conditionValue) {
  if (conditionValue === undefined) return true;
  if (conditionValue === null) return recordValue === null || recordValue === undefined;
  if (Array.isArray(conditionValue)) {
    return conditionValue.includes(recordValue);
  }
  if (typeof conditionValue === 'object' && conditionValue !== null) {
    // Handle Op-like or complex conditions
    const syms = Object.getOwnPropertySymbols(conditionValue);
    if (syms.length > 0) {
      // Sequelize Symbol operators like Op.in
      for (const sym of syms) {
        const val = conditionValue[sym];
        if (Array.isArray(val) && val.includes(recordValue)) return true;
      }
    }
    if (conditionValue.in && Array.isArray(conditionValue.in)) {
      return conditionValue.in.includes(recordValue);
    }
  }
  return recordValue === conditionValue;
}

function matchesWhere(record, where = {}) {
  if (!where || typeof where !== 'object') return true;
  for (const [key, expected] of Object.entries(where)) {
    if (!matchesCondition(record[key], expected)) {
      return false;
    }
  }
  return true;
}

class InMemoryModelInstance {
  constructor(data, model) {
    Object.assign(this, data);
    this._model = model;
  }

  async update(changes) {
    Object.assign(this, changes);
    const idx = this._model._records.findIndex((r) => r.id === this.id);
    if (idx !== -1) {
      Object.assign(this._model._records[idx], changes);
    }
    return this;
  }

  async destroy() {
    this._model._records = this._model._records.filter((r) => r !== this && r.id !== this.id);
    return true;
  }

  toJSON() {
    const copy = { ...this };
    delete copy._model;
    return copy;
  }
}

class InMemoryModel {
  constructor(name) {
    this.name = name;
    this._records = [];
    this.hooks = new Map();
  }

  addHook(hookName, nameOrFn, fn) {
    const handler = typeof nameOrFn === 'function' ? nameOrFn : fn;
    if (!this.hooks.has(hookName)) this.hooks.set(hookName, []);
    this.hooks.get(hookName).push(handler);
  }

  async _runHooks(hookName, item, options) {
    const list = this.hooks.get(hookName) || [];
    for (const fn of list) {
      await fn(item, options);
    }
  }

  async create(data, options = {}) {
    const record = { ...data };
    await this._runHooks('beforeValidate', record, options);
    await this._runHooks('beforeCreate', record, options);
    const instance = new InMemoryModelInstance(record, this);
    this._records.push(instance);
    await this._runHooks('afterCreate', instance, options);
    return instance;
  }

  async bulkCreate(items, options = {}) {
    const created = [];
    for (const item of items) {
      created.push(await this.create(item, options));
    }
    return created;
  }

  async findByPk(id, options = {}) {
    const found = this._records.find((r) => r.id === id || r.storeId === id || r.websiteId === id);
    return found || null;
  }

  async findOne(options = {}) {
    const where = options.where || {};
    const found = this._records.find((r) => matchesWhere(r, where));
    return found || null;
  }

  async findAll(options = {}) {
    const where = options.where || {};
    let results = this._records.filter((r) => matchesWhere(r, where));
    if (options.limit && typeof options.limit === 'number') {
      const offset = options.offset || 0;
      results = results.slice(offset, offset + options.limit);
    }
    return results;
  }

  async update(changes, options = {}) {
    const where = options.where || {};
    const matching = this._records.filter((r) => matchesWhere(r, where));
    for (const record of matching) {
      await this._runHooks('beforeUpdate', record, options);
      Object.assign(record, changes);
      await this._runHooks('afterUpdate', record, options);
    }
    return [matching.length, matching];
  }

  async destroy(options = {}) {
    const where = options.where || {};
    const beforeCount = this._records.length;
    this._records = this._records.filter((r) => !matchesWhere(r, where));
    return beforeCount - this._records.length;
  }

  async count(options = {}) {
    const where = options.where || {};
    return this._records.filter((r) => matchesWhere(r, where)).length;
  }

  async truncate() {
    const count = this._records.length;
    this._records = [];
    return count;
  }
}

/**
 * Creates an in-memory collection of models matching Sequelize conventions.
 *
 * @param {string[]} modelNames - Names of the models to create (e.g. ['Store', 'User', 'Product'])
 * @returns {object} Map of modelName -> InMemoryModel with attached mock sequelize
 */
function createInMemoryModelAdapter(modelNames = []) {
  const models = {};
  const mockSequelize = {
    config: { database: 'mock_in_memory_test', host: 'localhost' },
    transaction: async (cb) => {
      const mockTx = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      if (typeof cb === 'function') {
        return cb(mockTx);
      }
      return mockTx;
    },
  };

  for (const name of modelNames) {
    const model = new InMemoryModel(name);
    model.sequelize = mockSequelize;
    models[name] = model;
  }

  models.sequelize = mockSequelize;
  return models;
}

module.exports = {
  InMemoryModel,
  InMemoryModelInstance,
  createInMemoryModelAdapter,
};
