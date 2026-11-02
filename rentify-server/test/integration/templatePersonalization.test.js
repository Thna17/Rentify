const test = require('node:test');
const assert = require('node:assert/strict');
const { personalizeTemplateContent } = require('../../src/modules/websites/templatePersonalization');
test('a template without starter content retains merchant identity and contact details', () => {
 const result=personalizeTemplateContent([], {name:'Lotus',logo:'https://example.com/logo.webp',contact:'012345678',email:'owner@example.com',location:'Phnom Penh'});
 const values=Object.fromEntries(result.map(item=>[item.label,item.value]));
 assert.equal(values['Website Name'].text,'Lotus');
 assert.equal(values.Logo.url,'https://example.com/logo.webp');
 assert.equal(values['Phone Number'].text,'012345678');
 assert.equal(values['Contact Email'].text,'owner@example.com');
 assert.equal(values.Locations.text,'Phnom Penh');
 assert.equal(result.some(item=>item.label==='Product'),false);
});
test('existing contact aliases are personalized once without duplicate rows', () => {
 const result=personalizeTemplateContent([{category:'Footer',label:'Phone',type:'text',value:{text:'old'}},{category:'Footer',label:'Address',type:'text',value:{text:'old'}},{category:'Footer',label:'Email',type:'text',value:{text:'demo@example.com'}}],{phone:'012345678',location:'Kampot',email:'real@example.com'});
 assert.equal(result.length,3);
 assert.equal(result[0].value.text,'012345678');
 assert.equal(result[1].value.text,'Kampot');
 assert.equal(result[2].value.text,'real@example.com');
});
test('empty onboarding fields do not insert empty contact sections', () => {
 assert.deepEqual(personalizeTemplateContent([],{}),[]);
});
