const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const database = process.env.CORE_DB_NAME || process.env.DB_NAME || '';
const isolated = process.env.NODE_ENV === 'test' && /(?:test|ci)/i.test(database);

test('a website outbox delivery cannot discard a concurrent template update', { skip: !isolated }, async (t) => {
  const sequelize = require('../../src/config/db');
  const { WebsiteSyncOutbox } = require('../../src/models');
  const sync = require('../../src/modules/commerce-sync/ecommerceSyncService');
  const websiteId = randomUUID();
  let release;
  let entered;
  const deliveryBlocked = new Promise((resolve) => { release = resolve; });
  const deliveryStarted = new Promise((resolve) => { entered = resolve; });
  const delivered = [];
  let worker;
  let writer;
  t.mock.method(sync.apiClient, 'put', async (_url, payload) => {
    delivered.push(payload.websiteTemplateId);
    if (delivered.length === 1) { entered(); await deliveryBlocked; }
  });
  await WebsiteSyncOutbox.create({ websiteId, status: 'pending',
    payload: { _syncType: 'template', websiteTemplateId: 1 } });
  try {
    worker = sync.retryWebsiteSync(websiteId);
    await deliveryStarted;
    let writerFinished = false;
    writer = sequelize.transaction(async (transaction) => {
      await sync.queueWebsiteTemplate(websiteId, 2, { transaction });
      writerFinished = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(writerFinished, false, 'writer must wait for the in-flight delivery');
    release();
    await worker;
    await writer;
    await sync.retryWebsiteSync(websiteId);
    const result = await WebsiteSyncOutbox.findByPk(websiteId);
    assert.deepEqual(delivered, [1, 2]);
    assert.equal(result.payload.websiteTemplateId, 2);
    assert.equal(result.status, 'synced');
  } finally {
    release();
    await Promise.allSettled([worker, writer].filter(Boolean));
    await WebsiteSyncOutbox.destroy({ where: { websiteId } });
    await sequelize.close();
  }
});
