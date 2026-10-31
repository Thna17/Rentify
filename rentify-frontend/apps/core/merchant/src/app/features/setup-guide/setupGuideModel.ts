/**
 * Turns Core's launch checklist (GET /api/stores/mine/launch-checklist, version 2) into the
 * four steps of the merchant setup guide. Every tick comes from the backend; nothing is marked
 * done because the merchant tapped it. Design: docs/specs/merchant-setup-guide.md.
 */

export type ChecklistStatus = 'complete' | 'incomplete' | 'blocked' | 'pending' | 'failed';

export interface ChecklistItem {
  id: string;
  status: ChecklistStatus;
  reasonCode: string | null;
  nextAction: { code: string } | null;
  detail: string | null;
}

export interface LaunchChecklist {
  version: number;
  stale: boolean;
  merchantPath: 'marketplace' | 'storefront';
  channels?: {
    marketplace?: { enabled: boolean; publicationStatus?: string };
    storefront?: { applicable: boolean; status?: string; publicationStatus?: string };
  };
  items: ChecklistItem[];
}

export type GuideStepId = 'store_details' | 'first_product' | 'delivery_fee' | 'live';
export type GuideStepState = 'done' | 'todo' | 'waiting' | 'failed' | 'unknown';
export type GuideAction =
  | 'edit_store'
  | 'add_product'
  | 'add_sku'
  | 'review_products'
  | 'set_delivery_fee'
  | 'customize_storefront'
  | 'enable_marketplace'
  | 'preview'
  | 'contact_support'
  | 'retry';

export interface GuideStep {
  id: GuideStepId;
  stage: 'setup' | 'live';
  state: GuideStepState;
  reasonCode: string | null;
  action: GuideAction | null;
  /** Safe text from Rentify (an admin's moderation reason); never shown for other states. */
  detail: string | null;
}

export interface SetupGuide {
  steps: GuideStep[];
  doneCount: number;
  totalCount: number;
  complete: boolean;
  /** Commerce facts could not be read; some steps are unknown, not undone. */
  stale: boolean;
  liveChannel: 'marketplace' | 'storefront';
}

const ACTIONS: Record<string, GuideAction> = {
  ADD_PRODUCT: 'add_product',
  // The store has a sellable product but none with a product code (SKU) yet.
  ADD_SKU: 'add_sku',
  REVIEW_PRODUCT_VISIBILITY: 'review_products',
  SET_DELIVERY_FEE: 'set_delivery_fee',
  EDIT_STORE_DETAILS: 'edit_store',
  SET_PRIMARY_CATEGORY: 'edit_store',
  CUSTOMIZE_STOREFRONT: 'customize_storefront',
  REVIEW_STOREFRONT: 'customize_storefront',
  CHOOSE_TEMPLATE: 'customize_storefront',
  ENABLE_MARKETPLACE: 'enable_marketplace',
  CONTACT_SUPPORT: 'contact_support',
  RETRY_CHECKLIST: 'retry',
  VIEW_MARKETPLACE: 'preview',
  VIEW_STOREFRONT: 'preview',
  PREVIEW_STORE: 'preview',
};

const STALE_REASONS = new Set(['COMMERCE_PROJECTION_STALE', 'COMMERCE_FACTS_TIMEOUT', 'COMMERCE_FACTS_UNAVAILABLE']);

export const actionFor = (item?: ChecklistItem | null): GuideAction | null =>
  (item?.nextAction?.code && ACTIONS[item.nextAction.code]) || null;

const isStale = (item?: ChecklistItem | null) =>
  Boolean(item && (item.nextAction?.code === 'RETRY_CHECKLIST' || (item.reasonCode && STALE_REASONS.has(item.reasonCode))));

const step = (id: GuideStepId, stage: GuideStep['stage'], state: GuideStepState, item?: ChecklistItem | null,
  action: GuideAction | null = actionFor(item)): GuideStep => ({
  id, stage, state, reasonCode: item?.reasonCode ?? null, action, detail: state === 'failed' ? item?.detail ?? null : null,
});

/** A task the merchant does: done, to do, or unknown while Commerce can't be read. */
const taskStep = (id: GuideStepId, item?: ChecklistItem | null): GuideStep => {
  if (!item) return step(id, 'setup', 'unknown', null, 'retry');
  if (item.status === 'complete') return step(id, 'setup', 'done', item, null);
  if (isStale(item)) return step(id, 'setup', 'unknown', item, 'retry');
  if (item.status === 'failed') return step(id, 'setup', 'failed', item);
  return step(id, 'setup', 'todo', item);
};

const storeDetailsStep = (details?: ChecklistItem, category?: ChecklistItem): GuideStep => {
  if (details?.status === 'complete' && category?.status === 'complete') return step('store_details', 'setup', 'done', details, null);
  if (details && details.status === 'blocked') return step('store_details', 'setup', 'failed', details, 'contact_support');
  const missing = details?.status !== 'complete' ? details : category;
  return step('store_details', 'setup', 'todo', missing, actionFor(missing) || 'edit_store');
};

/** Going live is automatic once the setup steps are done, so it usually waits rather than asks. */
const liveStep = (item?: ChecklistItem | null): GuideStep => {
  if (!item) return step('live', 'live', 'unknown', null, 'retry');
  if (item.status === 'complete') return step('live', 'live', 'done', item, 'preview');
  if (item.status === 'failed') return step('live', 'live', 'failed', item, actionFor(item) || 'contact_support');
  if (item.status === 'pending') return step('live', 'live', 'waiting', item, null);
  if (isStale(item)) return step('live', 'live', 'unknown', item, 'retry');
  const action = actionFor(item);
  // Things only the merchant can do on this step itself; anything else is an earlier step.
  if (action === 'enable_marketplace' || action === 'customize_storefront' || action === 'review_products') {
    return step('live', 'live', 'todo', item, action);
  }
  return step('live', 'live', 'waiting', item, null);
};

export function toSetupGuide(checklist: LaunchChecklist): SetupGuide {
  const byId = new Map(checklist.items.map((entry) => [entry.id, entry]));
  const marketplaceEnabled = checklist.channels?.marketplace?.enabled !== false;
  const storefrontPublication = byId.get('publication_storefront');
  const liveChannel: SetupGuide['liveChannel'] = !marketplaceEnabled && storefrontPublication ? 'storefront' : 'marketplace';
  const steps: GuideStep[] = [
    storeDetailsStep(byId.get('store_details'), byId.get('primary_category')),
    taskStep('first_product', byId.get('first_product_sku')),
    taskStep('delivery_fee', byId.get('delivery_policy')),
    liveStep(liveChannel === 'storefront' ? storefrontPublication : byId.get('publication_marketplace')),
  ];
  const doneCount = steps.filter((entry) => entry.state === 'done').length;
  return {
    steps,
    doneCount,
    totalCount: steps.length,
    complete: doneCount === steps.length,
    stale: checklist.stale || steps.some((entry) => entry.state === 'unknown'),
    liveChannel,
  };
}

/** The first step that needs the merchant, for the main button on the hand-off screen and the card. */
export const nextStep = (guide: SetupGuide): GuideStep | null =>
  guide.steps.find((entry) => entry.state === 'todo' || entry.state === 'failed') ?? null;
