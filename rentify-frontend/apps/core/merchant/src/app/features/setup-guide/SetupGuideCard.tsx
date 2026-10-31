import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { AlertCircle, ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, HelpCircle, PartyPopper } from 'lucide-react';
import { useChannels } from '../../../context/ChannelContext';
import { useAccess } from '../../../utils/access';
import { marketplaceStoreUrl, openPosApp, storefrontUrl } from '../../../utils/storeLinks';
import { useSetupGuide } from './SetupGuideContext';
import { nextStep, type GuideAction, type GuideStep, type GuideStepState } from './setupGuideModel';

const STATE_ICON: Record<GuideStepState, React.ReactNode> = {
  done: <Check className="h-3.5 w-3.5" strokeWidth={3} />,
  todo: null,
  waiting: <Clock3 className="h-3.5 w-3.5" />,
  failed: <AlertCircle className="h-3.5 w-3.5" />,
  unknown: <HelpCircle className="h-3.5 w-3.5" />,
};

const STATE_RING: Record<GuideStepState, string> = {
  done: 'border-foreground bg-foreground text-background',
  todo: 'border-foreground/30 text-foreground',
  waiting: 'border-dashed border-foreground/40 text-foreground/60',
  failed: 'border-destructive text-destructive',
  unknown: 'border-foreground/20 text-foreground/40',
};

const ACTION_LABEL: Record<GuideAction, string> = {
  add_product: 'merchant.setup.actionAddProduct',
  add_sku: 'merchant.setup.actionOpenProducts',
  review_products: 'merchant.setup.actionReviewProducts',
  set_delivery_fee: 'merchant.setup.actionSetDeliveryFee',
  edit_store: 'merchant.setup.actionEditStore',
  customize_storefront: 'merchant.setup.actionCustomize',
  enable_marketplace: 'merchant.setup.actionEnableMarketplace',
  preview: 'merchant.setup.actionPreview',
  contact_support: 'merchant.setup.actionContactSupport',
  retry: 'merchant.setup.actionRetry',
};

const StateMark = ({ state }: { state: GuideStepState }) => (
  <span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${STATE_RING[state]}`}>
    {STATE_ICON[state]}
  </span>
);

const actionButton = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold transition-colors';
const primaryButton = `${actionButton} bg-foreground text-background hover:opacity-90`;
const secondaryButton = `${actionButton} bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]`;

/** Runs a guide action; shared by the card's steps so every button goes to the same place. */
function useGuideAction() {
  const navigate = useNavigate();
  const { store, toggleMarketplace } = useChannels();
  const { refresh, setDeliverySheetOpen, guide } = useSetupGuide();
  const storeLike = store as Parameters<typeof marketplaceStoreUrl>[0];
  return (action: GuideAction) => {
    switch (action) {
      case 'add_product': return navigate('/products/create');
      case 'add_sku': return navigate('/products');
      case 'review_products': return navigate('/products');
      case 'set_delivery_fee': return setDeliverySheetOpen(true);
      case 'edit_store': return navigate('/settings/account');
      case 'customize_storefront': return navigate('/store-management');
      case 'enable_marketplace': return void toggleMarketplace(true).then(refresh);
      case 'contact_support': return navigate('/help');
      case 'retry': return void refresh();
      case 'preview': {
        const href = guide?.liveChannel === 'storefront' ? storefrontUrl(storeLike) : marketplaceStoreUrl(storeLike);
        window.open(href, '_blank', 'noopener,noreferrer');
        return undefined;
      }
      default: return undefined;
    }
  };
}

function StepRow({ step, open }: { step: GuideStep; open: boolean }) {
  const { t } = useTranslation();
  const run = useGuideAction();
  const { guide } = useSetupGuide();
  const live = guide?.liveChannel === 'storefront' ? 'merchant.setup.stepLiveStorefront' : 'merchant.setup.stepLiveMarketplace';
  const title = {
    store_details: 'merchant.setup.stepStoreDetails',
    first_product: step.action === 'add_sku' ? 'merchant.setup.stepProductSku' : 'merchant.setup.stepFirstProduct',
    delivery_fee: 'merchant.setup.stepDeliveryFee',
    live,
  }[step.id];

  let why = '';
  if (step.state === 'unknown') why = t('merchant.setup.unknown');
  else if (step.id === 'store_details' && step.state !== 'done') why = t('merchant.setup.stepStoreDetailsWhy');
  else if (step.id === 'first_product' && step.action === 'add_sku') why = t('merchant.setup.stepProductSkuWhy');
  else if (step.id === 'first_product' && step.state !== 'done') why = t('merchant.setup.stepFirstProductWhy');
  else if (step.id === 'delivery_fee' && step.state !== 'done') why = t('merchant.setup.stepDeliveryFeeWhy');
  else if (step.id === 'live') {
    if (step.state === 'done') why = t('merchant.setup.liveDone');
    else if (step.state === 'failed') why = t('merchant.setup.liveFailed');
    else if (step.action === 'enable_marketplace') why = t('merchant.setup.liveDisabled');
    else if (step.action === 'customize_storefront') why = t('merchant.setup.liveCustomize');
    else if (step.action === 'review_products') why = t('merchant.setup.liveReviewProducts');
    else why = guide?.liveChannel === 'storefront' ? t('merchant.setup.liveWaitingStorefront') : t('merchant.setup.liveWaiting');
  }

  const showAction = step.action && (step.state !== 'done' || step.action === 'preview');
  return (
    <li className={`flex gap-3 border-t border-border/60 px-4 py-3.5 md:px-5 ${open ? 'bg-muted/50' : ''}`}>
      <StateMark state={step.state} />
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] font-semibold ${step.state === 'done' && step.id !== 'live' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {t(title)}
        </p>
        {why && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{why}</p>}
        {step.detail && (
          <p className="mt-2 rounded-lg border-l-4 border-foreground/70 bg-muted px-3 py-2 text-[13px]">
            <span className="font-semibold">{t('merchant.setup.messageFromRentify')}: </span>
            {step.detail}
          </p>
        )}
        {open && step.id === 'first_product' && step.action !== 'add_sku' && (
          <p className="mt-2 rounded-lg bg-card px-3 py-2 text-[12.5px] text-muted-foreground">{t('merchant.setup.stepFirstProductTip')}</p>
        )}
        {open && step.action && (
          <button type="button" className={`${primaryButton} mt-3 w-full sm:w-auto`} onClick={() => run(step.action as GuideAction)}>
            {t(ACTION_LABEL[step.action])}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
      {!open && showAction && (
        <button type="button" className={`${secondaryButton} shrink-0 self-center`} onClick={() => run(step.action as GuideAction)}>
          {t(ACTION_LABEL[step.action as GuideAction])}
          {step.action === 'preview' && <ArrowUpRight className="h-3.5 w-3.5" />}
        </button>
      )}
    </li>
  );
}

function OptionalSteps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = [
    { key: 'share', title: 'merchant.setup.optionalShare', why: 'merchant.setup.optionalShareWhy', run: () => navigate('/share') },
    { key: 'pos', title: 'merchant.setup.optionalPos', why: 'merchant.setup.optionalPosWhy', run: openPosApp },
    { key: 'staff', title: 'merchant.setup.optionalStaff', why: 'merchant.setup.optionalStaffWhy', run: () => navigate('/settings/staff') },
  ];
  return (
    <div className="border-t border-border/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left text-[13px] text-muted-foreground md:px-5"
      >
        <span>{t('merchant.setup.optionalSummary')}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul>
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 border-t border-border/60 px-4 py-3 md:px-5">
              <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-2 border-foreground/20" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-foreground">{t(item.title)}</p>
                <p className="text-[13px] text-muted-foreground">{t(item.why)}</p>
              </div>
              <button type="button" className={`${secondaryButton} shrink-0`} onClick={item.run}>{t('merchant.setup.open')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The owner's setup guide (docs/specs/merchant-setup-guide.md, wireframe screens 2, 3 and 9). */
function OwnerSetupGuide() {
  const { t } = useTranslation();
  const { guide, loading, error, refresh, hidden, setHidden } = useSetupGuide();
  const [showDoneSetup, setShowDoneSetup] = useState(false);

  if (loading && !guide) {
    return <div className="h-48 animate-pulse rounded-3xl bg-muted" aria-label={t('merchant.setup.title')} />;
  }
  if (error && !guide) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
        <AlertCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="flex-1 text-[13.5px] text-muted-foreground">{t('merchant.setup.loadError')}</p>
        <button type="button" className={secondaryButton} onClick={() => void refresh()}>{t('merchant.setup.actionRetry')}</button>
      </section>
    );
  }
  if (!guide || hidden) return null;

  if (guide.complete) {
    return (
      <section className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]" aria-live="polite">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <PartyPopper className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-foreground">{t('merchant.setup.doneTitle')}</h2>
          <p className="text-[13px] text-muted-foreground">{t('merchant.setup.doneBody')}</p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => setHidden(true)}>{t('merchant.setup.close')}</button>
      </section>
    );
  }

  const setupSteps = guide.steps.filter((entry) => entry.stage === 'setup');
  const liveSteps = guide.steps.filter((entry) => entry.stage === 'live');
  const setupDone = setupSteps.every((entry) => entry.state === 'done');
  const next = nextStep(guide);
  const percent = Math.round((guide.doneCount / guide.totalCount) * 100);

  return (
    <section aria-labelledby="setup-guide-title" className="overflow-hidden rounded-3xl border-2 border-foreground bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3 px-4 pb-3 pt-4 md:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="setup-guide-title" className="text-[17px] font-semibold tracking-tight text-foreground">{t('merchant.setup.title')}</h2>
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {t('merchant.setup.progress', { done: guide.doneCount, total: guide.totalCount })}
            {guide.doneCount <= 1 && ` · ${t('merchant.setup.minutes')}`}
          </p>
        </div>
        <button type="button" className="min-h-[44px] rounded-xl px-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => setHidden(true)}>
          {t('merchant.setup.hide')}
        </button>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={guide.totalCount}
        aria-valuenow={guide.doneCount}
        aria-label={t('merchant.setup.title')}
        className="mx-4 mb-2 h-2 overflow-hidden rounded-full bg-muted md:mx-5"
      >
        <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${percent}%` }} />
      </div>

      <p className="flex justify-between px-4 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground md:px-5">
        <span>1 · {t('merchant.setup.stageSetup')}</span>
        <span>{setupSteps.filter((entry) => entry.state === 'done').length}/{setupSteps.length}</span>
      </p>
      <ul>
        {setupDone && !showDoneSetup ? (
          <li className="flex items-center gap-3 border-t border-border/60 px-4 py-3 md:px-5">
            <StateMark state="done" />
            <p className="flex-1 text-[14px] font-semibold text-muted-foreground">{t('merchant.setup.stepsDone', { count: setupSteps.length })}</p>
            <button type="button" className="min-h-[44px] px-2 text-[13px] font-semibold text-muted-foreground" onClick={() => setShowDoneSetup(true)}>
              {t('merchant.setup.show')}
            </button>
          </li>
        ) : (
          // Unfinished steps first, so the next action sits near the top on a phone.
          [...setupSteps]
            .sort((a, b) => Number(a.state === 'done') - Number(b.state === 'done'))
            .map((entry) => <StepRow key={entry.id} step={entry} open={entry.id === next?.id} />)
        )}
      </ul>

      <p className="flex justify-between px-4 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground md:px-5">
        <span>2 · {t('merchant.setup.stageLive')}</span>
        <span>{liveSteps.filter((entry) => entry.state === 'done').length}/{liveSteps.length}</span>
      </p>
      <ul>
        {liveSteps.map((entry) => <StepRow key={entry.id} step={entry} open={entry.id === next?.id} />)}
      </ul>

      <OptionalSteps />
    </section>
  );
}

/** Staff never get the owner's guide: only the tasks their permissions allow (wireframe screen 10). */
function StaffGetStarted() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const access = useAccess();
  const { hidden, setHidden } = useSetupGuide();
  const tasks = [
    access.can('manage_pos') && { key: 'pos', title: 'merchant.setup.staffPos', why: 'merchant.setup.staffPosWhy', run: openPosApp },
    access.can('manage_orders') && { key: 'orders', title: 'merchant.setup.staffOrders', why: 'merchant.setup.staffOrdersWhy', run: () => navigate('/orders') },
    access.can('manage_products') && { key: 'products', title: 'merchant.setup.staffProducts', why: 'merchant.setup.staffProductsWhy', run: () => navigate('/products') },
  ].filter(Boolean) as { key: string; title: string; why: string; run: () => void }[];
  if (hidden || tasks.length === 0) return null;
  return (
    <section aria-labelledby="staff-start-title" className="overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 px-4 py-3 md:px-5">
        <h2 id="staff-start-title" className="flex-1 text-[16px] font-semibold text-foreground">{t('merchant.setup.staffTitle')}</h2>
        <button type="button" className="min-h-[44px] rounded-xl px-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => setHidden(true)}>
          {t('merchant.setup.hide')}
        </button>
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task.key} className="flex items-center gap-3 border-t border-border/60 px-4 py-3 md:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">{t(task.title)}</p>
              <p className="text-[13px] text-muted-foreground">{t(task.why)}</p>
            </div>
            <button type="button" className={`${secondaryButton} shrink-0`} onClick={task.run}>{t('merchant.setup.open')}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SetupGuideCard() {
  const access = useAccess();
  return access.isOwner ? <OwnerSetupGuide /> : <StaffGetStarted />;
}

export default SetupGuideCard;
