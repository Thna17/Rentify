const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../../modules/campaigns/campaignPolicy');
const valid = () => ({ slug:'halloween-2026',title:'Halloween',description:'Selected offers',bannerUrl:'/assets/collections/sale.png',status:'published',startsAt:'2026-10-01T00:00:00Z',endsAt:'2026-11-02T00:00:00Z',submissionEndsAt:'2026-11-01T00:00:00Z',minimumDiscount:50,homepage:true,priority:0 });
test('campaign validation rejects unsafe artwork, dates, discounts and unsupported states',()=>{
  assert.equal(policy.validate(valid()).minimumDiscount,50);
  for(const patch of [{bannerUrl:'javascript:alert(1)'},{bannerUrl:'//evil.test/a.png'},{bannerUrl:'https://user:secret@example.test/a.png'},{endsAt:'invalid'},{endsAt:'2026-09-01'},{submissionEndsAt:'2026-12-01'},{minimumDiscount:-1},{minimumDiscount:101},{minimumDiscount:49.5},{status:'anything'},{slug:'../admin'},{homepage:'false'}])assert.throws(()=>policy.validate({...valid(),...patch}));
});
test('campaign windows and submission deadlines use exact inclusive/exclusive boundaries',()=>{
  const c=valid();assert.equal(policy.active(c,new Date(c.startsAt)),true);assert.equal(policy.active(c,new Date(c.endsAt)),false);assert.equal(policy.active({...c,status:'draft'},new Date(c.startsAt)),false);
  assert.equal(policy.accepting(c,new Date(c.startsAt)),true);assert.equal(policy.accepting(c,new Date(c.submissionEndsAt)),false);assert.equal(policy.active(c,new Date('2026-10-01T00:00:00Z')),true);
});
test('discount eligibility uses cents without rounding 49.99% up to 50%',()=>{
  assert.equal(policy.qualifies({price:'50.00',compareAtPrice:'100.00'},50),true);
  assert.equal(policy.qualifies({price:'50.01',compareAtPrice:'100.00'},50),false);
  for(const price of ['NaN','-1','Infinity','1.000'])assert.equal(policy.qualifies({price,compareAtPrice:'10'},50),false);
  assert.equal(policy.qualifies({price:'10.00',compareAtPrice:null},0),true);
});
test('all active variants must qualify, and pricing edits invalidate prior approval',()=>{
  const p={price:'50',compareAtPrice:'100',hasVariants:true,ProductVariants:[{id:'a',status:'active',price:'50',compareAtPrice:'100'}]};
  assert.equal(policy.qualifies(p,50),true);const previous=policy.fingerprint(p);
  p.ProductVariants[0].price='51';assert.equal(policy.qualifies(p,50),false);assert.notEqual(policy.fingerprint(p),previous);
  assert.equal(policy.qualifies({...p,ProductVariants:[]},50),false);
});
