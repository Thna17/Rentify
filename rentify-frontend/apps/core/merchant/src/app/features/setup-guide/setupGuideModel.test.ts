import { describe, expect, it } from 'vitest';
import { nextStep, toSetupGuide, type ChecklistItem, type LaunchChecklist } from './setupGuideModel';

const item = (id: string, status: ChecklistItem['status'], reasonCode: string | null = null, action: string | null = null, detail: string | null = null): ChecklistItem => ({
  id, status, reasonCode, nextAction: action ? { code: action } : null, detail,
});

// Shapes taken from rentify-server launchChecklistService (version 2).
const newStore = (): LaunchChecklist => ({
  version: 2, stale: false, merchantPath: 'marketplace',
  channels: { marketplace: { enabled: true }, storefront: { applicable: false } },
  items: [
    item('store_details', 'complete'),
    item('verified_contact', 'complete'),
    item('primary_category', 'complete'),
    item('delivery_policy', 'incomplete', 'DELIVERY_POLICY_REQUIRED', 'SET_DELIVERY_FEE'),
    item('first_product_sku', 'incomplete', 'VALID_PRODUCT_REQUIRED', 'ADD_PRODUCT'),
    item('preview', 'blocked', 'VALID_PRODUCT_REQUIRED_FOR_PREVIEW', 'ADD_PRODUCT'),
    item('publication_marketplace', 'blocked', 'VALID_PRODUCT_REQUIRED', 'ADD_PRODUCT'),
  ],
});
const withItem = (checklist: LaunchChecklist, replacement: ChecklistItem): LaunchChecklist => ({
  ...checklist, items: checklist.items.map((entry) => (entry.id === replacement.id ? replacement : entry)),
});
const states = (checklist: LaunchChecklist) => toSetupGuide(checklist).steps.map((s) => `${s.id}:${s.state}`);

describe('setup guide from the launch checklist', () => {
  it('starts a new store at 1 of 4 with the product as the next step', () => {
    const guide = toSetupGuide(newStore());
    expect(states(newStore())).toEqual(['store_details:done', 'first_product:todo', 'delivery_fee:todo', 'live:waiting']);
    expect(guide.doneCount).toBe(1);
    expect(guide.totalCount).toBe(4);
    expect(guide.complete).toBe(false);
    expect(nextStep(guide)?.id).toBe('first_product');
    expect(nextStep(guide)?.action).toBe('add_product');
  });

  it('waits on going live, without asking, until the fee is set', () => {
    let checklist = withItem(newStore(), item('first_product_sku', 'complete'));
    checklist = withItem(checklist, item('publication_marketplace', 'blocked', 'DELIVERY_POLICY_REQUIRED', 'SET_DELIVERY_FEE'));
    const guide = toSetupGuide(checklist);
    expect(states(checklist)).toEqual(['store_details:done', 'first_product:done', 'delivery_fee:todo', 'live:waiting']);
    expect(guide.steps[3].action).toBeNull();
    expect(nextStep(guide)?.action).toBe('set_delivery_fee');
  });

  it('is complete once the store is live, with preview as the live action', () => {
    let checklist = withItem(newStore(), item('first_product_sku', 'complete'));
    checklist = withItem(checklist, item('delivery_policy', 'complete'));
    checklist = withItem(checklist, item('publication_marketplace', 'complete', null, 'VIEW_MARKETPLACE'));
    const guide = toSetupGuide(checklist);
    expect(guide.complete).toBe(true);
    expect(guide.steps[3].action).toBe('preview');
    expect(nextStep(guide)).toBeNull();
  });

  it('shows an admin suspension with its reason and a support action', () => {
    const checklist = withItem(newStore(), item('publication_marketplace', 'failed', 'SELLER_SUSPENDED', 'CONTACT_SUPPORT', 'Repeated undelivered orders.'));
    const live = toSetupGuide(checklist).steps[3];
    expect(live.state).toBe('failed');
    expect(live.action).toBe('contact_support');
    expect(live.detail).toBe('Repeated undelivered orders.');
  });

  it('never shows a reason text for steps that did not fail', () => {
    const checklist = withItem(newStore(), item('first_product_sku', 'incomplete', 'VALID_PRODUCT_REQUIRED', 'ADD_PRODUCT', 'internal'));
    expect(toSetupGuide(checklist).steps[1].detail).toBeNull();
  });

  it('marks steps unknown, not undone, when Commerce cannot be read', () => {
    const stale: LaunchChecklist = { ...newStore(), stale: true, items: newStore().items.map((entry) =>
      ['delivery_policy', 'first_product_sku', 'publication_marketplace'].includes(entry.id)
        ? item(entry.id, 'blocked', 'COMMERCE_FACTS_TIMEOUT', 'RETRY_CHECKLIST') : entry) };
    const guide = toSetupGuide(stale);
    expect(states(stale)).toEqual(['store_details:done', 'first_product:unknown', 'delivery_fee:unknown', 'live:unknown']);
    expect(guide.stale).toBe(true);
    expect(guide.doneCount).toBe(1);
  });

  it('asks for a product code, not a first product, when products exist without a SKU', () => {
    const checklist = withItem(newStore(), item('first_product_sku', 'incomplete', 'VALID_SKU_REQUIRED', 'ADD_SKU'));
    const product = toSetupGuide(checklist).steps[1];
    expect(product).toMatchObject({ state: 'todo', action: 'add_sku', reasonCode: 'VALID_SKU_REQUIRED' });
  });

  it('asks to finish the category when the store still needs one', () => {
    const checklist = withItem(newStore(), item('primary_category', 'incomplete', 'PRIMARY_CATEGORY_REQUIRED', 'SET_PRIMARY_CATEGORY'));
    const details = toSetupGuide(checklist).steps[0];
    expect(details.state).toBe('todo');
    expect(details.action).toBe('edit_store');
  });

  it('asks to turn the marketplace back on when the merchant opted out and has no website', () => {
    const checklist = withItem(newStore(), item('publication_marketplace', 'blocked', 'MARKETPLACE_DISABLED', 'ENABLE_MARKETPLACE'));
    expect(toSetupGuide(checklist).steps[3]).toMatchObject({ state: 'todo', action: 'enable_marketplace' });
  });

  it('follows the online store when the marketplace is off', () => {
    const checklist: LaunchChecklist = {
      ...newStore(), merchantPath: 'storefront',
      channels: { marketplace: { enabled: false }, storefront: { applicable: true, status: 'building' } },
      items: [...newStore().items, item('publication_storefront', 'pending', 'STOREFRONT_PREPARING')],
    };
    const guide = toSetupGuide(checklist);
    expect(guide.liveChannel).toBe('storefront');
    expect(guide.steps[3].state).toBe('waiting');
  });
});
