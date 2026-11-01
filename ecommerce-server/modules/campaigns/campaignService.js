const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const Campaign = require('../../models/MarketplaceCampaign');
const Submission = require('../../models/CampaignSubmission');
const Audit = require('../../models/CampaignAudit');
const { Product, ProductVariant } = require('../../models');
const catalog = require('../store-catalog').storeCatalogService;
const policy = require('./campaignPolicy');

const publicCampaign = c => Object.fromEntries(['id','slug','title','description','bannerUrl','startsAt','endsAt','submissionEndsAt','minimumDiscount','homepage','priority'].map(k => [k,c[k]]));
const actor = req => String(req.user?.id || req.staff?.id || 'unknown');
const audit = (campaignId, actorId, action, details, transaction, submissionId = null) => Audit.create({ campaignId, submissionId, actorId, action, details }, { transaction });
const revision = (row, expected) => { if (!Number.isInteger(expected) || row.revision !== expected) policy.fail('This record changed. Refresh and try again.', 409); };
const include = () => [catalog.eligibleStore, { model: ProductVariant, as: 'ProductVariants', required: false, where: { status: 'active' } }];
async function findPublicProduct(id, transaction) {
  return Product.findOne({ where: { id, ...catalog.eligibleProductWhere() }, include: include(), transaction });
}
const campaignById = async (id, transaction) => {
  const c = await Campaign.findByPk(id, { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!c) policy.fail('Campaign not found', 404);
  return c;
};
async function adminList() { return { campaigns: await Campaign.findAll({ order: [['createdAt','DESC']] }) }; }
async function save(id, input, actorId) {
  const data = policy.validate(input);
  return sequelize.transaction(async transaction => {
    let c;
    if (id) {
      c = await campaignById(id, transaction); revision(c, input.revision);
      // Stable URLs keep already shared invitations working.
      if (c.slug !== data.slug) policy.fail('The campaign link cannot be changed');
      await c.update({ ...data, revision: c.revision + 1 }, { transaction });
    } else c = await Campaign.create({ ...data, createdBy: actorId }, { transaction });
    await audit(c.id, actorId, id ? 'campaign_updated' : 'campaign_created', { revision: c.revision, status: c.status }, transaction);
    return { campaign: c };
  });
}
async function merchantList(storeId) {
  const campaigns = await Campaign.findAll({ where: { status: 'published', endsAt: { [Op.gt]: new Date() } }, order: [['startsAt','ASC']] });
  const submissions = await Submission.findAll({ where: { storeId }, order: [['updatedAt','DESC']] });
  const ids = submissions.map(s => s.productId);
  const products = ids.length ? await Product.findAll({ where: { id: ids, storeId }, attributes: ['id','name','price','compareAtPrice'] }) : [];
  const names = new Map(products.map(p => [p.id, p]));
  return { campaigns: campaigns.map(c => ({ ...publicCampaign(c), acceptingSubmissions: policy.accepting(c) })),
    submissions: submissions.map(s => ({ ...s.toJSON(), product: names.get(s.productId) || null })) };
}
async function submit(campaignId, storeId, input, actorId) {
  if (typeof input.productId !== 'string') policy.fail('Choose a product');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 1000)) policy.fail('Note must be under 1000 characters');
  return sequelize.transaction(async transaction => {
    const c = await campaignById(campaignId, transaction);
    if (!policy.accepting(c)) policy.fail('This campaign is not accepting submissions', 409);
    const owned = await Product.findOne({ where: { id: input.productId, storeId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!owned) policy.fail('Product not found', 404);
    const product = await findPublicProduct(owned.id, transaction);
    if (!product) policy.fail('Publish this product to the marketplace before submitting it', 409);
    if (!policy.qualifies(product, c.minimumDiscount)) policy.fail(`Every active product option must meet the ${c.minimumDiscount}% discount requirement`, 409);
    const [s, created] = await Submission.findOrCreate({ where: { campaignId, productId: owned.id },
      defaults: { storeId, merchantNote: input.note || '' }, transaction });
    if (!created) {
      if (s.status === 'approved' && s.approvedFingerprint === policy.fingerprint(product)) return { submission: s };
      if (s.status === 'pending') return { submission: s };
      await s.update({ status: 'pending', merchantNote: input.note || '', reviewNote: '', reviewedBy: null, approvedFingerprint: null, revision: s.revision + 1 }, { transaction });
    }
    await audit(c.id, actorId, 'product_submitted', { productId: owned.id, storeId, revision: s.revision }, transaction, s.id);
    return { submission: s };
  });
}
async function withdraw(campaignId, submissionId, storeId, expected, actorId) {
  return sequelize.transaction(async transaction => {
    await campaignById(campaignId, transaction);
    const s = await Submission.findOne({ where: { id: submissionId, campaignId, storeId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!s) policy.fail('Submission not found', 404);
    revision(s, expected);
    await s.update({ status: 'withdrawn', approvedFingerprint: null, revision: s.revision + 1 }, { transaction });
    await audit(campaignId, actorId, 'product_withdrawn', { storeId }, transaction, s.id);
    return { submission: s };
  });
}
async function review(campaignId, submissionId, input, actorId) {
  if (!['approved','rejected'].includes(input.status)) policy.fail('Choose approve or reject');
  if (typeof input.note !== 'string' || input.note.length > 1000 || (input.status === 'rejected' && !input.note.trim())) policy.fail('Explain your decision (up to 1000 characters)');
  return sequelize.transaction(async transaction => {
    const c = await campaignById(campaignId, transaction);
    const s = await Submission.findOne({ where: { id: submissionId, campaignId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!s) policy.fail('Submission not found', 404);
    revision(s, input.revision);
    if (s.status === 'withdrawn') policy.fail('The merchant withdrew this submission', 409);
    let fingerprint = null;
    if (input.status === 'approved') {
      if (c.status === 'closed' || new Date(c.endsAt) <= new Date()) policy.fail('The campaign has ended', 409);
      // Serialize against price changes while the decision is made; public reads recheck it too.
      await Product.findByPk(s.productId, { transaction, lock: transaction.LOCK.UPDATE });
      const p = await findPublicProduct(s.productId, transaction);
      if (!p || p.storeId !== s.storeId || !policy.qualifies(p, c.minimumDiscount)) policy.fail('This product is no longer eligible', 409);
      fingerprint = policy.fingerprint(p);
    }
    await s.update({ status: input.status, reviewNote: input.note.trim(), reviewedBy: actorId, approvedFingerprint: fingerprint, revision: s.revision + 1 }, { transaction });
    await audit(campaignId, actorId, `product_${input.status}`, { revision: s.revision, note: input.note.trim() }, transaction, s.id);
    return { submission: s };
  });
}
async function adminDetail(id) {
  const campaign = await campaignById(id);
  const submissions = await Submission.findAll({ where: { campaignId: id }, order: [['createdAt','DESC']] });
  const ids = submissions.map(s => s.productId);
  const products = ids.length ? await Product.findAll({ where: { id: ids }, include: [{ model: ProductVariant, as: 'ProductVariants', required: false, where: { status: 'active' } }] }) : [];
  const mapped = new Map(products.map(p => [p.id,p]));
  return { campaign, submissions: submissions.map(s => {
    const p = mapped.get(s.productId);
    return { ...s.toJSON(), product: p ? { id: p.id, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, images: p.images } : null,
      priceChanged: !!p && s.status === 'approved' && s.approvedFingerprint !== policy.fingerprint(p) };
  }), audit: await Audit.findAll({ where: { campaignId: id }, order: [['createdAt','DESC']], limit: 100 }) };
}
async function publicList() {
  const now = new Date();
  const campaigns = await Campaign.findAll({ where: { status: 'published', startsAt: { [Op.lte]: now }, endsAt: { [Op.gt]: now } }, order: [['priority','ASC'],['startsAt','DESC']] });
  return { campaigns: campaigns.map(publicCampaign) };
}
async function publicDetail(slug, query = {}) {
  const c = await Campaign.findOne({ where: { slug } });
  if (!c || !policy.active(c)) policy.fail('This campaign is not available', 404);
  const approved = await Submission.findAll({ where: { campaignId: c.id, status: 'approved' }, attributes: ['productId','storeId','approvedFingerprint'] });
  const byId = new Map(approved.map(s => [s.productId,s]));
  const rows = approved.length ? await Product.findAll({ where: { id: { [Op.in]: approved.map(s => s.productId) }, ...catalog.eligibleProductWhere() }, include: include(), order: [['createdAt','DESC']] }) : [];
  let products = rows.filter(p => {
    const s = byId.get(p.id);
    return s.storeId === p.storeId && s.approvedFingerprint === policy.fingerprint(p) && policy.qualifies(p, c.minimumDiscount);
  });
  const term = String(query.search || '').trim().toLowerCase().slice(0,120);
  if (term) products = products.filter(p => p.name.toLowerCase().includes(term));
  if (query.sort === 'price-asc') products.sort((a,b) => Number(a.price)-Number(b.price));
  if (query.sort === 'price-desc') products.sort((a,b) => Number(b.price)-Number(a.price));
  const page = Math.max(1, Math.min(100000, parseInt(query.page,10) || 1));
  const limit = Math.max(1, Math.min(60, parseInt(query.limit,10) || 24));
  return { campaign: publicCampaign(c), products: products.slice((page-1)*limit, page*limit).map(p => catalog.publicProduct(p)), total: products.length, page, limit };
}
module.exports = { actor, adminList, save, merchantList, submit, withdraw, review, adminDetail, publicList, publicDetail };
