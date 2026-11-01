const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const policy = require('../../modules/campaigns/campaignPolicy');
const fixture = () => {
  const now = Date.now();
  const campaign = { id:'campaign', slug:'event',status:'published',minimumDiscount:50,revision:1,startsAt:new Date(now-1000),endsAt:new Date(now+86400000),submissionEndsAt:new Date(now+3600000) };
  const product = {id:'product',name:'A product',storeId:'store-a',price:'50.00',compareAtPrice:'100.00',ProductVariants:[],status:'active',images:[]};
  const submissions=[],events=[];let eligible=true;
  const matches = (row,where) => Object.entries(where||{}).every(([k,v]) => Array.isArray(v) ? v.includes(row[k]) : row[k]===v);
  const wrap = value => Object.assign(value, { toJSON(){return {...this};},async update(changes){Object.assign(this,changes);return this;} });
  wrap(campaign);
  const transaction = {LOCK:{UPDATE:'UPDATE'}};
  const models = {
    Campaign:{findByPk:async id=>id===campaign.id?campaign:null,findOne:async({where})=>matches(campaign,where)?campaign:null},
    Submission:{
      findOne:async({where})=>submissions.find(s=>matches(s,where))||null,
      findAll:async({where})=>submissions.filter(s=>matches(s,where)),
      findOrCreate:async({where,defaults})=>{const old=submissions.find(s=>matches(s,where));if(old)return[old,false];const s=wrap({id:'submission',revision:1,status:'pending',...where,...defaults});submissions.push(s);return[s,true];},
    },
    Audit:{create:async e=>{events.push(e);return e;}},
    Product:{findOne:async({where,include})=>{if(include)return eligible?product:null;return matches(product,where)?product:null;},findByPk:async()=>product,findAll:async()=>eligible?[product]:[]},
    ProductVariant:{},
  };
  const module = {exports:{}};
  const requireFake = name => {
    if(name==='sequelize')return{Op:{in:Symbol('in'),lte:Symbol('lte'),gt:Symbol('gt')}};
    if(name==='../../config/db')return{sequelize:{transaction:fn=>fn(transaction)}};
    if(name==='../../models/MarketplaceCampaign')return models.Campaign;
    if(name==='../../models/CampaignSubmission')return models.Submission;
    if(name==='../../models/CampaignAudit')return models.Audit;
    if(name==='../../models')return models;
    if(name==='../store-catalog')return{storeCatalogService:{eligibleProductWhere:()=>({}),eligibleStore:{},publicProduct:p=>p}};
    if(name==='./campaignPolicy')return policy;
    throw new Error(name);
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../modules/campaigns/campaignService.js'),'utf8'),{require:requireFake,module,Date,Map,Number,parseInt,String,Object});
  return {service:module.exports,campaign,product,submissions,events,setEligible:value=>{eligible=value;}};
};
test('campaign submissions are store-scoped, pending and idempotent',async()=>{
  const f=fixture();await assert.rejects(()=>f.service.submit('campaign','store-b',{productId:'product'},'other'),{statusCode:404});
  await f.service.submit('campaign','store-a',{productId:'product'},'owner');
  await f.service.submit('campaign','store-a',{productId:'product'},'owner');
  assert.equal(f.submissions.length,1);assert.equal(f.submissions[0].status,'pending');assert.equal(f.events.length,1);
  assert.equal((await f.service.publicDetail('event')).total,0);
});
test('approval, withdrawal and stale review protection enforce the full publication lifecycle',async()=>{
  const f=fixture();await f.service.submit('campaign','store-a',{productId:'product'},'owner');
  await assert.rejects(()=>f.service.review('campaign','submission',{revision:99,status:'approved',note:''},'admin'),{statusCode:409});
  await f.service.review('campaign','submission',{revision:1,status:'approved',note:'Fits the event'},'admin');
  assert.equal((await f.service.publicDetail('event')).total,1);
  await assert.rejects(()=>f.service.withdraw('campaign','submission','store-b',2,'other'),{statusCode:404});
  await f.service.withdraw('campaign','submission','store-a',2,'owner');
  assert.equal((await f.service.publicDetail('event')).total,0);
  await assert.rejects(()=>f.service.review('campaign','submission',{revision:3,status:'approved',note:''},'admin'),{statusCode:409});
});
test('approval is removed from public results when price, eligibility, or campaign window changes',async()=>{
  const f=fixture();await f.service.submit('campaign','store-a',{productId:'product'},'owner');await f.service.review('campaign','submission',{revision:1,status:'approved',note:''},'admin');
  f.product.price='49.00';assert.equal((await f.service.publicDetail('event')).total,0);
  f.product.price='50.00';f.setEligible(false);assert.equal((await f.service.publicDetail('event')).total,0);
  f.setEligible(true);f.campaign.endsAt=new Date(Date.now()-1);await assert.rejects(()=>f.service.publicDetail('event'),{statusCode:404});
});
test('closed submissions, ineligible discounts and rejection notes are enforced',async()=>{
  const f=fixture();f.campaign.submissionEndsAt=new Date(Date.now()-1);await assert.rejects(()=>f.service.submit('campaign','store-a',{productId:'product'},'owner'),{statusCode:409});
  f.campaign.submissionEndsAt=new Date(Date.now()+10000);f.product.price='50.01';await assert.rejects(()=>f.service.submit('campaign','store-a',{productId:'product'},'owner'),{statusCode:409});
  f.product.price='50.00';await f.service.submit('campaign','store-a',{productId:'product'},'owner');await assert.rejects(()=>f.service.review('campaign','submission',{revision:1,status:'rejected',note:''},'admin'),{statusCode:400});
  await f.service.review('campaign','submission',{revision:1,status:'rejected',note:'Not suitable'},'admin');assert.equal((await f.service.publicDetail('event')).total,0);
});
