import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AUTH_URL, DASHBOARD_URL, MARKETPLACE_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, ExternalLink, Globe2, LayoutDashboard, LoaderCircle, MonitorSmartphone, RefreshCw, ShieldCheck, ShoppingBag, Store, WifiOff } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ONBOARDING_PATHS, ONBOARDING_STORAGE_KEY, STEPS, classifyOnboardingError, completionState, deriveResumeStep, emitOnboardingEvent, emptyDraft, safeDraft } from './onboardingState';
import { startSellingCopy } from './startSellingCopy';

const storeUrl = `${RENTIFY_API_BASE}/api/stores`;
const requestTimeout = 12000;
const inputClass = 'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100';
const primaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200';

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), requestTimeout);
  try {
    const response = await fetch(url, { credentials: 'include', ...options, signal: controller.signal, headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || body.error || 'Request failed');
      error.status = response.status;
      throw error;
    }
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

function loadDraft() {
  try { return safeDraft(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) || '{}')); }
  catch { return safeDraft({}); }
}

function StepIndicator({ current, copy, hasWebsitePath }) {
  const steps = [[STEPS.ACCOUNT, copy.stepAccount], [STEPS.CONTACT, copy.stepContact], [STEPS.PATH, copy.stepPath], [STEPS.DETAILS, copy.stepDetails], ...(hasWebsitePath ? [[STEPS.TEMPLATE, copy.stepTemplate]] : []), [STEPS.COMPLETE, copy.stepComplete]];
  const currentIndex = Math.max(0, steps.findIndex(([id]) => id === current));
  return <nav aria-label={copy.progress} className="overflow-x-auto pb-2"><ol className="flex min-w-max items-center gap-2 text-sm">{steps.map(([id, label], index) => <li key={id} className="flex items-center gap-2"><span aria-current={id === current ? 'step' : undefined} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 font-medium ${id === current ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : index < currentIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500'}`}>{index < currentIndex ? <Check aria-hidden="true" className="h-4 w-4" /> : <span aria-hidden="true">{index + 1}</span>}{label}</span>{index < steps.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-slate-300" />}</li>)}</ol></nav>;
}

function ErrorPanel({ kind, copy, onRetry }) {
  const Icon = kind === 'offline' ? WifiOff : CircleAlert;
  return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950"><div className="flex gap-3"><Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-semibold">{copy.errorTitle}</h2><p className="mt-1 text-sm leading-6">{copy[kind] || copy.server}</p></div></div>{onRetry && <button type="button" className={`${secondaryClass} mt-4 border-rose-300`} onClick={onRetry}><RefreshCw aria-hidden="true" className="h-4 w-4" />{copy.retry}</button>}</div>;
}

export default function StartSelling() {
  const { language, toggleLanguage } = useLanguage();
  const copy = startSellingCopy[language] || startSellingCopy.EN;
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get('plan') || 'starter';
  const submitLock = useRef(false);
  const [draft, setDraft] = useState(loadDraft);
  const [user, setUser] = useState(null);
  const [storeData, setStoreData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [step, setStep] = useState(STEPS.ACCOUNT);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorKind, setErrorKind] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const applyAuthoritativeState = useCallback((resolvedUser, resolvedStore, savedDraft) => {
    setUser(resolvedUser);
    setStoreData(resolvedStore);
    // A draft saved by another account on this browser must not prefill this one
    const ownerId = String(resolvedUser?.id || '');
    // Older drafts have no ownerId; treat them as foreign when their email belongs to someone else
    const foreign = Boolean(ownerId) && (savedDraft.ownerId
      ? savedDraft.ownerId !== ownerId
      : Boolean(savedDraft.email && resolvedUser?.email && savedDraft.email.toLowerCase() !== String(resolvedUser.email).toLowerCase()));
    const currentDraft = foreign ? { ...emptyDraft } : savedDraft;
    setDraft((before) => { const previous = foreign ? { ...emptyDraft } : before; return safeDraft({ ...previous, ...currentDraft, ownerId: ownerId || currentDraft.ownerId, name: resolvedStore?.name || currentDraft.name || previous.name, primaryCategory: resolvedStore?.primaryCategory || currentDraft.primaryCategory || previous.primaryCategory, email: currentDraft.email || resolvedUser?.email || previous.email, contact: currentDraft.contact || resolvedUser?.phoneNumber || previous.contact }); });
    const next = deriveResumeStep({ user: resolvedUser, store: resolvedStore, draft: currentDraft });
    setStep(next);
    emitOnboardingEvent('onboarding_resumed', { step: next, path: currentDraft.path || 'undecided', hasStore: Boolean(resolvedStore), hasWebsite: Boolean(resolvedStore?.websiteId) });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setErrorKind('');
    const currentDraft = loadDraft();
    try {
      const [categoryResult, authResult, storeResult, templateResult, packageResult] = await Promise.all([
        request(`${storeUrl}/categories`),
        request(`${RENTIFY_API_BASE}/api/auth/me`).catch((error) => error.status === 401 ? null : Promise.reject(error)),
        request(`${storeUrl}/mine`).catch((error) => [401, 404].includes(error.status) ? null : Promise.reject(error)),
        request(`${RENTIFY_API_BASE}/templates`).catch(() => []),
        request(`${RENTIFY_API_BASE}/api/packages`).catch(() => []),
      ]);
      const resolvedUser = authResult?.user || authResult?.data || null;
      const resolvedStore = storeResult?.data || null;
      setCategories(categoryResult?.data || []);
      setTemplates(Array.isArray(templateResult) ? templateResult : templateResult?.data || []);
      setPackages(Array.isArray(packageResult) ? packageResult : packageResult?.data || []);
      applyAuthoritativeState(resolvedUser, resolvedStore, currentDraft);
    } catch (error) { setErrorKind(classifyOnboardingError(error, navigator.onLine)); }
    finally { setLoading(false); }
  }, [applyAuthoritativeState]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { document.documentElement.lang = language === 'KH' ? 'km' : 'en'; }, [language]);
  useEffect(() => { try { localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ ...draft, step })); } catch { /* storage may be disabled */ } }, [draft, step]);

  const updateDraft = (changes) => setDraft((value) => safeDraft({ ...value, ...changes }));
  const authUrl = (mode) => `${AUTH_URL}/${mode}?returnUrl=${encodeURIComponent(window.location.href)}`;
  const verifyUrl = `${AUTH_URL}/verify-email?returnUrl=${encodeURIComponent(window.location.href)}${user?.email ? `&email=${encodeURIComponent(user.email)}` : ''}${user?.phoneNumber ? `&phone=${encodeURIComponent(user.phoneNumber)}` : ''}`;
  const selectedPackage = useMemo(() => packages.find((item) => item.id === draft.packageId) || packages.find((item) => String(item.name || '').toLowerCase() === requestedPlan.toLowerCase()) || packages.find((item) => String(item.name || '').toLowerCase() === 'starter') || packages[0], [packages, draft.packageId, requestedPlan]);

  const choosePath = (path) => { updateDraft({ path, step: STEPS.DETAILS }); setStep(STEPS.DETAILS); emitOnboardingEvent('onboarding_path_selected', { path, step: STEPS.DETAILS }); };
  const validateDetails = () => {
    const errors = {};
    if (!draft.name.trim()) errors.name = copy.required;
    if (!draft.primaryCategory) errors.primaryCategory = copy.required;
    if (draft.path === ONBOARDING_PATHS.STOREFRONT) {
      if (!draft.email.trim()) errors.email = copy.required;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) errors.email = copy.invalidEmail;
      if (!draft.contact.trim()) errors.contact = copy.required;
    }
    setFieldErrors(errors); return Object.keys(errors).length === 0;
  };

  const saveStore = async (event) => {
    event.preventDefault();
    if (!validateDetails() || submitLock.current) return;
    submitLock.current = true; setSubmitting(true); setErrorKind('');
    try {
      const result = await request(storeData ? `${storeUrl}/mine` : storeUrl, { method: storeData ? 'PATCH' : 'POST', body: JSON.stringify(storeData ? { primaryCategory: draft.primaryCategory, marketplaceEnabled: true } : { name: draft.name.trim(), primaryCategory: draft.primaryCategory, marketplaceEnabled: true }) });
      const savedStore = { ...(storeData || {}), ...(result.data || result) };
      setStoreData(savedStore);
      emitOnboardingEvent('onboarding_store_saved', { path: draft.path, step: STEPS.DETAILS, result: storeData ? 'updated' : 'created', hasStore: true });
      const next = draft.path === ONBOARDING_PATHS.STOREFRONT ? STEPS.TEMPLATE : STEPS.COMPLETE;
      updateDraft({ step: next }); setStep(next);
    } catch (error) { const kind = classifyOnboardingError(error, navigator.onLine); setErrorKind(kind); if (kind === 'conflict') await refresh(); }
    finally { submitLock.current = false; setSubmitting(false); }
  };

  const createStorefront = async () => {
    if (!draft.templateId || !selectedPackage?.id || submitLock.current) return;
    submitLock.current = true; setSubmitting(true); setErrorKind('');
    try {
      await request(`${RENTIFY_API_BASE}/api/websites`, { method: 'POST', body: JSON.stringify({ templateId: draft.templateId, packageId: selectedPackage.id, businessData: { name: storeData?.name || draft.name, primaryCategory: storeData?.primaryCategory || draft.primaryCategory, email: draft.email, contact: draft.contact, location: draft.location || undefined } }) });
      const authoritative = await request(`${storeUrl}/mine`);
      setStoreData(authoritative.data); updateDraft({ packageId: selectedPackage.id, step: STEPS.COMPLETE }); setStep(STEPS.COMPLETE);
      emitOnboardingEvent('onboarding_storefront_created', { path: ONBOARDING_PATHS.STOREFRONT, step: STEPS.COMPLETE, result: 'success', hasStore: true, hasWebsite: true });
    } catch (error) { const kind = classifyOnboardingError(error, navigator.onLine); setErrorKind(kind); if (kind === 'conflict') await refresh(); }
    finally { submitLock.current = false; setSubmitting(false); }
  };

  const goBack = () => { const previous = step === STEPS.TEMPLATE ? STEPS.DETAILS : step === STEPS.DETAILS ? STEPS.PATH : STEPS.ACCOUNT; updateDraft({ step: previous }); setStep(previous); };
  const addStorefront = () => { updateDraft({ path: ONBOARDING_PATHS.STOREFRONT, step: STEPS.TEMPLATE }); setStep(STEPS.TEMPLATE); };
  const status = completionState(storeData);
  const statusText = { approval_pending: copy.approvalPending, marketplace_ready: copy.marketReady, storefront_customization: copy.customize, storefront_live: copy.live, needs_changes: copy.needsChanges, suspended: copy.suspended }[status] || copy.approvalPending;

  return <div className={`min-h-screen bg-slate-50 text-slate-950 ${language === 'KH' ? 'font-khmer' : ''}`}>
    <a href="#onboarding-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:ring-4 focus:ring-indigo-300">{copy.skip}</a>
    <header className="border-b border-slate-200 bg-white" role="banner"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"><Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{copy.backHome}</Link><button type="button" onClick={toggleLanguage} className={secondaryClass} aria-label={`Switch language to ${copy.language}`}><Globe2 aria-hidden="true" className="h-4 w-4" />{copy.language}</button></div></header>
    <main id="onboarding-main" className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-12">
      <section aria-labelledby="onboarding-title" className="min-w-0"><p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-700">{copy.eyebrow}</p><h1 id="onboarding-title" className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{copy.title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{copy.subtitle}</p><div className="mt-6"><StepIndicator current={step} copy={copy} hasWebsitePath={draft.path === ONBOARDING_PATHS.STOREFRONT || Boolean(storeData?.websiteId)} /></div>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {loading ? <div role="status" aria-live="polite" className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-600"><LoaderCircle aria-hidden="true" className="h-8 w-8 animate-spin motion-reduce:animate-none" /><p>{copy.loading}</p></div> : <>
            {errorKind && <div className="mb-6"><ErrorPanel kind={errorKind} copy={copy} onRetry={refresh} /></div>}
            {step === STEPS.ACCOUNT && <div><ShieldCheck aria-hidden="true" className="h-10 w-10 text-indigo-700" /><h2 className="mt-5 text-2xl font-bold">{copy.accountTitle}</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">{copy.accountBody}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a className={primaryClass} href={authUrl('register')}>{copy.register}<ArrowRight aria-hidden="true" className="h-4 w-4" /></a><a className={secondaryClass} href={authUrl('login')}>{copy.signIn}</a></div></div>}
            {step === STEPS.CONTACT && <div><ShieldCheck aria-hidden="true" className="h-10 w-10 text-indigo-700" /><h2 className="mt-5 text-2xl font-bold">{copy.contactTitle}</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">{copy.contactBody}</p><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950">{user?.isVerified ? copy.verified : copy.notVerified}</p><p className="mt-1 break-all text-sm text-amber-900">{user?.email || user?.phoneNumber || copy.accountContact}</p></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a className={primaryClass} href={verifyUrl}>{copy.verify}<ExternalLink aria-hidden="true" className="h-4 w-4" /></a><button type="button" className={secondaryClass} onClick={refresh}><RefreshCw aria-hidden="true" className="h-4 w-4" />{copy.refresh}</button></div></div>}
            {step === STEPS.PATH && <div><h2 className="text-2xl font-bold">{copy.pathTitle}</h2><p className="mt-3 leading-7 text-slate-600">{copy.pathBody}</p><div className="mt-7 grid gap-4 md:grid-cols-2"><PathCard icon={ShoppingBag} title={copy.marketTitle} body={copy.marketBody} action={copy.choose} onClick={() => choosePath(ONBOARDING_PATHS.MARKETPLACE)} /><PathCard icon={MonitorSmartphone} title={copy.webTitle} body={copy.webBody} action={copy.choose} onClick={() => choosePath(ONBOARDING_PATHS.STOREFRONT)} /></div><p className="mt-6 text-sm leading-6 text-slate-500">{copy.pathNote}</p></div>}
            {step === STEPS.DETAILS && <DetailsForm copy={copy} draft={draft} updateDraft={updateDraft} categories={categories} fieldErrors={fieldErrors} storeData={storeData} submitting={submitting} onSubmit={saveStore} onBack={goBack} />}
            {step === STEPS.TEMPLATE && <TemplateStep copy={copy} templates={templates} draft={draft} updateDraft={updateDraft} selectedPackage={selectedPackage} submitting={submitting} onBack={goBack} onCreate={createStorefront} />}
            {step === STEPS.COMPLETE && <Completion copy={copy} storeData={storeData} statusText={statusText} onAddStorefront={addStorefront} />}
          </>}
        </div>
      </section>
      <aside aria-label={copy.summary} className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-100 text-indigo-800"><Store aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Store</p><p className="truncate font-bold">{storeData?.name || draft.name || '—'}</p></div></div><dl className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-sm"><div><dt className="text-slate-500">{copy.category}</dt><dd className="mt-1 font-semibold">{storeData?.primaryCategory || draft.primaryCategory || '—'}</dd></div><div><dt className="text-slate-500">{copy.accountContact}</dt><dd className="mt-1 break-all font-semibold">{user?.email || user?.phoneNumber || '—'}</dd></div></dl><div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-700"><CheckCircle2 aria-hidden="true" className="mb-2 h-5 w-5 text-emerald-700" />{copy.serverNote}</div><p aria-live="polite" className="mt-4 text-center text-xs text-slate-500">{copy.saved}</p></aside>
    </main>
  </div>;
}

function PathCard({ icon: Icon, title, body, action, badge, onClick }) {
  return <button type="button" aria-label={title} onClick={onClick} className="group rounded-2xl border-2 border-slate-200 p-5 text-left transition hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><Icon aria-hidden="true" className="h-8 w-8 text-indigo-700" />{badge && <span className="mt-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">{badge}</span>}<h3 className="mt-3 text-xl font-bold">{title}</h3><p className="mt-2 min-h-20 leading-6 text-slate-600">{body}</p><span className="mt-5 inline-flex items-center gap-2 font-semibold text-indigo-700">{action}<ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-1 motion-reduce:transform-none" /></span></button>;
}

function DetailsForm({ copy, draft, updateDraft, categories, fieldErrors, storeData, submitting, onSubmit, onBack }) {
  const fieldError = (key) => fieldErrors[key] && <span className="mt-2 block text-sm font-semibold text-rose-700">{fieldErrors[key]}</span>;
  return <form onSubmit={onSubmit} noValidate><h2 className="text-2xl font-bold">{copy.detailsTitle}</h2><p className="mt-3 leading-7 text-slate-600">{copy.detailsBody}</p><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="font-semibold text-slate-800 sm:col-span-2">{copy.name}<input className={inputClass} value={draft.name} disabled={Boolean(storeData)} onChange={(event) => updateDraft({ name: event.target.value })} aria-invalid={Boolean(fieldErrors.name)} required /><span className="mt-2 block text-sm font-normal text-slate-500">{copy.nameHint}</span>{fieldError('name')}</label><label className="font-semibold text-slate-800 sm:col-span-2">{copy.category}<select className={inputClass} value={draft.primaryCategory} onChange={(event) => updateDraft({ primaryCategory: event.target.value })} aria-invalid={Boolean(fieldErrors.primaryCategory)} required><option value="">{copy.categoryPlaceholder}</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{fieldError('primaryCategory')}</label>{draft.path === ONBOARDING_PATHS.STOREFRONT && <><label className="font-semibold text-slate-800">{copy.email}<input type="email" autoComplete="email" className={inputClass} value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} aria-invalid={Boolean(fieldErrors.email)} required />{fieldError('email')}</label><label className="font-semibold text-slate-800">{copy.phone}<input type="tel" autoComplete="tel" className={inputClass} value={draft.contact} onChange={(event) => updateDraft({ contact: event.target.value })} aria-invalid={Boolean(fieldErrors.contact)} required />{fieldError('contact')}</label><label className="font-semibold text-slate-800 sm:col-span-2">{copy.location} <span className="font-normal text-slate-500">({copy.optional})</span><input autoComplete="address-level1" className={inputClass} value={draft.location} onChange={(event) => updateDraft({ location: event.target.value })} /></label><p className="text-sm leading-6 text-slate-500 sm:col-span-2">{copy.contactHint}</p></>}</div><div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" className={secondaryClass} onClick={onBack}><ArrowLeft aria-hidden="true" className="h-4 w-4" />{copy.back}</button><button className={primaryClass} disabled={submitting}>{submitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{submitting ? copy.updating : draft.path === ONBOARDING_PATHS.STOREFRONT ? copy.saveWeb : copy.saveMarket}</button></div></form>;
}

function TemplateStep({ copy, templates, draft, updateDraft, selectedPackage, submitting, onBack, onCreate }) {
  return <div><h2 className="text-2xl font-bold">{copy.templateTitle}</h2><p className="mt-3 leading-7 text-slate-600">{copy.templateBody}</p>{templates.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2">{templates.map((template) => { const id = String(template.id ?? template.websiteTemplateId); const chosen = draft.templateId === id; return <button key={id} type="button" aria-pressed={chosen} onClick={() => updateDraft({ templateId: id })} className={`rounded-2xl border-2 p-5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${chosen ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}><div className="flex items-start justify-between gap-3"><MonitorSmartphone aria-hidden="true" className="h-7 w-7 text-indigo-700" />{chosen && <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-indigo-700" />}</div>{EDITORIAL_STYLES[template.websiteTemplateId] && <div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><img src={EDITORIAL_STYLES[template.websiteTemplateId].preview || EDITORIAL_STYLES[template.websiteTemplateId].image} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" /><div className="flex h-3" aria-hidden="true">{Object.values(EDITORIAL_STYLES[template.websiteTemplateId].palette).map((color, index) => <span key={index} className="flex-1" style={{ background: color }} />)}</div></div>}<h3 className="mt-4 text-lg font-bold">{template.name || template.templateName || `Template ${id}`}</h3><p className="mt-2 text-sm font-semibold text-indigo-700">{chosen ? copy.selected : copy.select}</p></button>; })}</div> : <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">{copy.noTemplates}</div>}{selectedPackage && <div className="mt-6 rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">{copy.trial}</p><p className="mt-1 font-bold">{selectedPackage.name}</p></div>}<div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" className={secondaryClass} onClick={onBack}><ArrowLeft aria-hidden="true" className="h-4 w-4" />{copy.back}</button><button type="button" className={primaryClass} disabled={!draft.templateId || !selectedPackage || submitting} onClick={onCreate}>{submitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{submitting ? copy.creating : copy.launch}</button></div></div>;
}

function Completion({ copy, storeData, statusText, onAddStorefront }) {
  return <div><CheckCircle2 aria-hidden="true" className="h-11 w-11 text-emerald-700" /><h2 className="mt-5 text-2xl font-bold">{copy.completeTitle}</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">{statusText}</p><div className="mt-6 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-sm font-bold ${storeData?.marketplaceApprovalStatus === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'}`}>{storeData?.marketplaceApprovalStatus === 'approved' ? copy.approvedBadge : copy.pendingBadge}</span><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-900">{storeData?.websiteId ? copy.websiteBadge : copy.noWebsiteBadge}</span></div><div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold">{copy.nextTitle}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy.addProducts}</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><a href={DASHBOARD_URL} className={primaryClass}>{copy.dashboard}<LayoutDashboard aria-hidden="true" className="h-4 w-4" /></a>{storeData?.id && <a href={`${String(MARKETPLACE_URL).replace(/\/+$/, '')}/stores/${storeData.id}`} className={secondaryClass}>{copy.viewStore}<ExternalLink aria-hidden="true" className="h-4 w-4" /></a>}<a href={MARKETPLACE_URL} className={secondaryClass}>{copy.marketplace}<ExternalLink aria-hidden="true" className="h-4 w-4" /></a></div></div>{!storeData?.websiteId && <button type="button" className="mt-6 w-full rounded-2xl border-2 border-dashed border-indigo-300 p-5 text-left transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200" onClick={onAddStorefront}><span className="font-bold text-indigo-800">{copy.addStorefront}</span><span className="mt-1 block text-sm text-slate-600">{copy.addStorefrontBody}</span></button>}</div>;
}
