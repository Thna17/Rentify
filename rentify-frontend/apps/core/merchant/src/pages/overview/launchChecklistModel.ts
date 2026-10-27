export type ChecklistStatus = 'complete' | 'incomplete' | 'blocked' | 'pending' | 'failed';

export interface LaunchChecklistItem {
  id: string;
  status: ChecklistStatus;
  reasonCode: string | null;
  nextAction: { code: string } | null;
  detail: string | null;
}

export interface LaunchChecklistData {
  version: number;
  observedAt: string;
  stale: boolean;
  staleReasonCode: string | null;
  merchantPath: 'marketplace' | 'storefront';
  summary: {
    completeCount: number;
    totalCount: number;
    pendingCount: number;
    blockedCount: number;
    failedCount: number;
  };
  channels: {
    marketplace: { enabled: boolean; publicationStatus: ChecklistStatus };
    storefront: { applicable: boolean; status?: string; publicationStatus?: ChecklistStatus };
  };
  items: LaunchChecklistItem[];
}

export type ChecklistLocale = 'en' | 'kh';

const en = {
  title: 'Launch checklist',
  description: 'Complete the essentials for each sales channel. Readiness is based on the latest server checks.',
  marketplacePath: 'Marketplace selling',
  storefrontPath: 'Marketplace + storefront',
  completeLabel: (done: number, total: number) => `${done} of ${total} complete`,
  updated: 'Checked',
  refresh: 'Refresh status',
  retry: 'Try again',
  loading: 'Checking your launch readiness…',
  emptyTitle: 'No launch checks are available',
  emptyBody: 'Refresh the page. If this continues, contact Rentify support.',
  forbiddenTitle: 'You cannot view launch readiness',
  forbiddenBody: 'Ask the Store owner for access or sign in with an authorized merchant account.',
  timeoutTitle: 'The readiness check timed out',
  timeoutBody: 'Your data was not changed. Try the check again.',
  offlineTitle: 'You appear to be offline',
  offlineBody: 'Reconnect to the internet, then retry the readiness check.',
  errorTitle: 'We could not check launch readiness',
  errorBody: 'The service did not return a usable response. Try again safely.',
  staleTitle: 'Some readiness facts may be out of date',
  staleBody: 'Catalog or policy data could not be confirmed. Refresh before acting on blocked items.',
  status: { complete: 'Complete', incomplete: 'Incomplete', blocked: 'Blocked', pending: 'Pending', failed: 'Failed' },
};

const kh = {
  title: 'បញ្ជីត្រៀមដាក់ឱ្យដំណើរការ',
  description: 'បំពេញចំណុចសំខាន់ៗសម្រាប់បណ្តាញលក់នីមួយៗ។ ស្ថានភាពនេះផ្អែកលើការត្រួតពិនិត្យចុងក្រោយពីម៉ាស៊ីនមេ។',
  marketplacePath: 'លក់នៅទីផ្សាររួម',
  storefrontPath: 'ទីផ្សាររួម និងហាងអនឡាញ',
  completeLabel: (done: number, total: number) => `បានបញ្ចប់ ${done} ក្នុងចំណោម ${total}`,
  updated: 'បានត្រួតពិនិត្យ',
  refresh: 'ពិនិត្យស្ថានភាពឡើងវិញ',
  retry: 'ព្យាយាមម្តងទៀត',
  loading: 'កំពុងពិនិត្យភាពត្រៀមរួចរបស់ហាង…',
  emptyTitle: 'មិនមានការត្រួតពិនិត្យសម្រាប់ការដាក់ឱ្យដំណើរការ',
  emptyBody: 'សូមផ្ទុកទំព័រឡើងវិញ។ បើបញ្ហានៅតែបន្ត សូមទាក់ទងផ្នែកជំនួយ Rentify។',
  forbiddenTitle: 'អ្នកមិនអាចមើលស្ថានភាពត្រៀមដាក់ឱ្យដំណើរការបានទេ',
  forbiddenBody: 'សូមស្នើសុំសិទ្ធិពីម្ចាស់ហាង ឬចូលដោយគណនីអាជីវករដែលមានសិទ្ធិ។',
  timeoutTitle: 'ការត្រួតពិនិត្យបានផុតកំណត់ពេល',
  timeoutBody: 'ទិន្នន័យរបស់អ្នកមិនត្រូវបានកែប្រែទេ។ សូមព្យាយាមពិនិត្យម្តងទៀត។',
  offlineTitle: 'អ្នកហាក់ដូចជាគ្មានអ៊ីនធឺណិត',
  offlineBody: 'សូមភ្ជាប់អ៊ីនធឺណិត ហើយព្យាយាមពិនិត្យម្តងទៀត។',
  errorTitle: 'យើងមិនអាចពិនិត្យភាពត្រៀមរួចបានទេ',
  errorBody: 'សេវាកម្មមិនបានផ្ញើចម្លើយដែលអាចប្រើបាន។ អ្នកអាចព្យាយាមម្តងទៀតដោយសុវត្ថិភាព។',
  staleTitle: 'ព័ត៌មានខ្លះអាចមិនទាន់ថ្មី',
  staleBody: 'មិនអាចបញ្ជាក់ទិន្នន័យផលិតផល ឬគោលការណ៍បានទេ។ សូមពិនិត្យឡើងវិញមុនអនុវត្តចំណុចដែលត្រូវបានរារាំង។',
  status: { complete: 'បានបញ្ចប់', incomplete: 'មិនទាន់បញ្ចប់', blocked: 'ត្រូវបានរារាំង', pending: 'កំពុងរង់ចាំ', failed: 'មិនជោគជ័យ' },
};

export const checklistCopy = (language?: string) => (language === 'kh' ? kh : en);

export const itemLabels: Record<ChecklistLocale, Record<string, string>> = {
  en: {
    store_details: 'Store details', verified_contact: 'Verified contact', primary_category: 'Primary Store category',
    delivery_policy: 'Delivery policy', return_policy: 'Return policy', first_product_sku: 'First valid Product and SKU',
    seller_application: 'Marketplace seller application', storefront_readiness: 'Storefront and template readiness',
    preview: 'Preview readiness', approval: 'Seller approval', publication_marketplace: 'Marketplace publication',
    publication_storefront: 'Storefront publication',
  },
  kh: {
    store_details: 'ព័ត៌មានលម្អិតរបស់ហាង', verified_contact: 'ទំនាក់ទំនងដែលបានផ្ទៀងផ្ទាត់', primary_category: 'ប្រភេទចម្បងរបស់ហាង',
    delivery_policy: 'គោលការណ៍ដឹកជញ្ជូន', return_policy: 'គោលការណ៍ប្រគល់ទំនិញ', first_product_sku: 'ផលិតផល និង SKU ត្រឹមត្រូវដំបូង',
    seller_application: 'ពាក្យស្នើសុំជាអ្នកលក់នៅទីផ្សាររួម', storefront_readiness: 'ភាពត្រៀមរួចនៃគំរូ និងហាងអនឡាញ',
    preview: 'ភាពត្រៀមរួចសម្រាប់ការមើលជាមុន', approval: 'ការអនុម័តអ្នកលក់', publication_marketplace: 'ការដាក់លក់នៅទីផ្សាររួម',
    publication_storefront: 'ការដាក់ហាងអនឡាញឱ្យដំណើរការ',
  },
};

const reasonEnglish: Record<string, string> = {
  STORE_DETAILS_MISSING: 'Add the Store information customers need.', STORE_NOT_ACTIVE: 'This Store is not active. Support must restore access.',
  CONTACT_NOT_VERIFIED: 'Verify the merchant email address or phone number.', PRIMARY_CATEGORY_REQUIRED: 'Choose a primary Store category.',
  DELIVERY_POLICY_REQUIRED: 'Add delivery commitments in the seller application.', DELIVERY_POLICY_INCOMPLETE: 'Complete both the delivery policy and seller commitments.',
  RETURN_POLICY_REQUIRED: 'Add return and refund commitments in the seller application.', RETURN_POLICY_INCOMPLETE: 'Complete the return and refund commitments.',
  VALID_PRODUCT_REQUIRED: 'Create an active, priced, categorized Product with stock.', VALID_SKU_REQUIRED: 'Add an active SKU with a price and available stock.',
  APPLICATION_PREREQUISITES_MISSING: 'Complete Store, contact, category, Product, and SKU requirements first.', APPLICATION_NOT_SUBMITTED: 'Submit the seller application for review.',
  APPLICATION_UNDER_REVIEW: 'Rentify is reviewing the seller application.', APPLICATION_NEEDS_CHANGES: 'The application needs the requested changes.', APPLICATION_REJECTED: 'The application was not approved. Review the decision before resubmitting.',
  APPLICATION_REQUIRED_FOR_APPROVAL: 'Submit the seller application before approval can begin.', APPROVAL_PENDING: 'Rentify is reviewing this Store for marketplace selling.',
  APPROVAL_REQUIRED: 'Marketplace publication waits for seller approval.', APPROVAL_NEEDS_CHANGES: 'Approval requires changes to the seller application.', APPROVAL_REJECTED: 'Seller approval was declined.',
  SELLER_SUSPENDED: 'Marketplace selling is suspended. Contact Rentify support.', STOREFRONT_TEMPLATE_REQUIRED: 'Choose a storefront template.',
  STOREFRONT_CUSTOMIZATION_REQUIRED: 'Finish the storefront setup and review it.', STOREFRONT_PREPARING: 'The storefront is still being prepared.',
  STOREFRONT_FAILED: 'The storefront could not be prepared.', STOREFRONT_SUSPENDED: 'The storefront is suspended.', STOREFRONT_EXPIRED: 'The storefront subscription is not active.',
  STOREFRONT_ARCHIVED: 'The storefront is archived.', STOREFRONT_DELETED: 'The storefront is no longer available.',
  VALID_PRODUCT_REQUIRED_FOR_PREVIEW: 'Add a valid Product and SKU before previewing the catalog.', STOREFRONT_NOT_READY_FOR_PREVIEW: 'Resolve the storefront issue before previewing it.',
  MARKETPLACE_DISABLED: 'Marketplace listing is turned off for this Store.', MARKETPLACE_PRODUCT_NOT_READY: 'Make the valid Product visible in the marketplace.',
  POLICIES_REQUIRED_FOR_PUBLICATION: 'Complete delivery, return, and refund policies before publication.', STOREFRONT_NOT_ACTIVE: 'Finish storefront setup before publishing this channel.',
  COMMERCE_FACTS_TIMEOUT: 'Catalog and policy checks timed out; no readiness decision was guessed.', COMMERCE_FACTS_UNAVAILABLE: 'Catalog and policy checks are temporarily unavailable.',
  COMMERCE_PROJECTION_STALE: 'Commerce has not received the latest Store version yet.',
};

const reasonKhmer: Record<string, string> = {
  STORE_DETAILS_MISSING: 'បន្ថែមព័ត៌មានហាងដែលអតិថិជនត្រូវការ។', STORE_NOT_ACTIVE: 'ហាងនេះមិនសកម្មទេ។ ផ្នែកជំនួយត្រូវស្តារសិទ្ធិឡើងវិញ។',
  CONTACT_NOT_VERIFIED: 'ផ្ទៀងផ្ទាត់អ៊ីមែល ឬលេខទូរស័ព្ទរបស់អាជីវករ។', PRIMARY_CATEGORY_REQUIRED: 'ជ្រើសរើសប្រភេទចម្បងរបស់ហាង។',
  DELIVERY_POLICY_REQUIRED: 'បន្ថែមការទទួលខុសត្រូវដឹកជញ្ជូនក្នុងពាក្យស្នើសុំអ្នកលក់។', DELIVERY_POLICY_INCOMPLETE: 'បំពេញគោលការណ៍ដឹកជញ្ជូន និងការទទួលខុសត្រូវអ្នកលក់។',
  RETURN_POLICY_REQUIRED: 'បន្ថែមការទទួលខុសត្រូវសម្រាប់ការប្រគល់ និងសងប្រាក់។', RETURN_POLICY_INCOMPLETE: 'បំពេញការទទួលខុសត្រូវសម្រាប់ការប្រគល់ និងសងប្រាក់។',
  VALID_PRODUCT_REQUIRED: 'បង្កើតផលិតផលសកម្ម មានតម្លៃ ប្រភេទ និងស្តុក។', VALID_SKU_REQUIRED: 'បន្ថែម SKU សកម្ម ដែលមានតម្លៃ និងស្តុក។',
  APPLICATION_PREREQUISITES_MISSING: 'បំពេញព័ត៌មានហាង ទំនាក់ទំនង ប្រភេទ ផលិតផល និង SKU ជាមុន។', APPLICATION_NOT_SUBMITTED: 'ដាក់ស្នើពាក្យសុំអ្នកលក់ដើម្បីពិនិត្យ។',
  APPLICATION_UNDER_REVIEW: 'Rentify កំពុងពិនិត្យពាក្យស្នើសុំអ្នកលក់។', APPLICATION_NEEDS_CHANGES: 'ពាក្យស្នើសុំត្រូវការការកែប្រែដែលបានស្នើ។', APPLICATION_REJECTED: 'ពាក្យស្នើសុំមិនត្រូវបានអនុម័តទេ។ សូមពិនិត្យសេចក្តីសម្រេចមុនដាក់ស្នើឡើងវិញ។',
  APPLICATION_REQUIRED_FOR_APPROVAL: 'ដាក់ស្នើពាក្យសុំអ្នកលក់ មុនចាប់ផ្តើមការអនុម័ត។', APPROVAL_PENDING: 'Rentify កំពុងពិនិត្យហាងនេះសម្រាប់ការលក់នៅទីផ្សាររួម។',
  APPROVAL_REQUIRED: 'ការដាក់លក់នៅទីផ្សាររួមត្រូវរង់ចាំការអនុម័តអ្នកលក់។', APPROVAL_NEEDS_CHANGES: 'ការអនុម័តត្រូវការកែប្រែពាក្យស្នើសុំ។', APPROVAL_REJECTED: 'ការអនុម័តអ្នកលក់ត្រូវបានបដិសេធ។',
  SELLER_SUSPENDED: 'ការលក់នៅទីផ្សាររួមត្រូវបានផ្អាក។ សូមទាក់ទងផ្នែកជំនួយ។', STOREFRONT_TEMPLATE_REQUIRED: 'ជ្រើសរើសគំរូហាងអនឡាញ។',
  STOREFRONT_CUSTOMIZATION_REQUIRED: 'បញ្ចប់ការរៀបចំហាងអនឡាញ ហើយពិនិត្យវា។', STOREFRONT_PREPARING: 'ហាងអនឡាញកំពុងត្រូវបានរៀបចំ។',
  STOREFRONT_FAILED: 'មិនអាចរៀបចំហាងអនឡាញបានទេ។', STOREFRONT_SUSPENDED: 'ហាងអនឡាញត្រូវបានផ្អាក។', STOREFRONT_EXPIRED: 'ការជាវហាងអនឡាញមិនសកម្មទេ។', STOREFRONT_ARCHIVED: 'ហាងអនឡាញត្រូវបានទុកក្នុងបណ្ណសារ។', STOREFRONT_DELETED: 'ហាងអនឡាញនេះលែងមានទៀតហើយ។',
  VALID_PRODUCT_REQUIRED_FOR_PREVIEW: 'បន្ថែមផលិតផល និង SKU ត្រឹមត្រូវ មុនមើលកាតាឡុកជាមុន។', STOREFRONT_NOT_READY_FOR_PREVIEW: 'ដោះស្រាយបញ្ហាហាងអនឡាញ មុនមើលជាមុន។',
  MARKETPLACE_DISABLED: 'ការដាក់លក់នៅទីផ្សាររួមត្រូវបានបិទសម្រាប់ហាងនេះ។', MARKETPLACE_PRODUCT_NOT_READY: 'កំណត់ឱ្យផលិតផលត្រឹមត្រូវអាចមើលឃើញនៅទីផ្សាររួម។',
  POLICIES_REQUIRED_FOR_PUBLICATION: 'បំពេញគោលការណ៍ដឹកជញ្ជូន ប្រគល់ទំនិញ និងសងប្រាក់ មុនដាក់លក់។', STOREFRONT_NOT_ACTIVE: 'បញ្ចប់ការរៀបចំហាងអនឡាញ មុនដាក់បណ្តាញនេះឱ្យដំណើរការ។',
  COMMERCE_FACTS_TIMEOUT: 'ការត្រួតពិនិត្យផលិតផល និងគោលការណ៍បានផុតពេល ដូច្នេះប្រព័ន្ធមិនបានសន្និដ្ឋានទេ។', COMMERCE_FACTS_UNAVAILABLE: 'ការត្រួតពិនិត្យផលិតផល និងគោលការណ៍មិនអាចប្រើបានបណ្តោះអាសន្ន។',
  COMMERCE_PROJECTION_STALE: 'Commerce មិនទាន់ទទួលបានកំណែហាងចុងក្រោយទេ។',
};

export const reasonLabel = (code: string | null, language?: string) => {
  if (!code) return '';
  const locale = language === 'kh' ? 'kh' : 'en';
  return (locale === 'kh' ? reasonKhmer[code] : reasonEnglish[code]) || (locale === 'kh' ? 'សូមពិនិត្យព័ត៌មាននេះ ហើយព្យាយាមម្តងទៀត។' : 'Review this requirement and try again.');
};

const actionLabels: Record<ChecklistLocale, Record<string, string>> = {
  en: { EDIT_STORE_DETAILS: 'Edit Store details', CONTACT_SUPPORT: 'Contact support', VERIFY_CONTACT: 'Verify contact', SET_PRIMARY_CATEGORY: 'Choose category', SUBMIT_APPLICATION: 'Open seller application', UPDATE_APPLICATION: 'Update application', COMPLETE_REQUIRED_ITEMS: 'Review required items', ADD_PRODUCT: 'Add Product', ADD_SKU: 'Manage Product SKUs', CHOOSE_TEMPLATE: 'Choose template', CUSTOMIZE_STOREFRONT: 'Customize storefront', REVIEW_STOREFRONT: 'Review storefront', PREVIEW_STORE: 'Preview catalog', ENABLE_MARKETPLACE: 'Open marketplace settings', REVIEW_PRODUCT_VISIBILITY: 'Review Product visibility', VIEW_MARKETPLACE: 'View marketplace readiness', VIEW_STOREFRONT: 'View storefront settings', RETRY_CHECKLIST: 'Refresh checks' },
  kh: { EDIT_STORE_DETAILS: 'កែព័ត៌មានហាង', CONTACT_SUPPORT: 'ទាក់ទងផ្នែកជំនួយ', VERIFY_CONTACT: 'ផ្ទៀងផ្ទាត់ទំនាក់ទំនង', SET_PRIMARY_CATEGORY: 'ជ្រើសរើសប្រភេទ', SUBMIT_APPLICATION: 'បើកពាក្យស្នើសុំអ្នកលក់', UPDATE_APPLICATION: 'កែពាក្យស្នើសុំ', COMPLETE_REQUIRED_ITEMS: 'ពិនិត្យចំណុចចាំបាច់', ADD_PRODUCT: 'បន្ថែមផលិតផល', ADD_SKU: 'គ្រប់គ្រង SKU ផលិតផល', CHOOSE_TEMPLATE: 'ជ្រើសរើសគំរូ', CUSTOMIZE_STOREFRONT: 'កែតម្រូវហាងអនឡាញ', REVIEW_STOREFRONT: 'ពិនិត្យហាងអនឡាញ', PREVIEW_STORE: 'មើលកាតាឡុកជាមុន', ENABLE_MARKETPLACE: 'បើកការកំណត់ទីផ្សាររួម', REVIEW_PRODUCT_VISIBILITY: 'ពិនិត្យការបង្ហាញផលិតផល', VIEW_MARKETPLACE: 'មើលភាពត្រៀមរួចទីផ្សាររួម', VIEW_STOREFRONT: 'មើលការកំណត់ហាងអនឡាញ', RETRY_CHECKLIST: 'ពិនិត្យឡើងវិញ' },
};

export const actionLabel = (code: string, language?: string) => actionLabels[language === 'kh' ? 'kh' : 'en'][code] || (language === 'kh' ? 'បន្ត' : 'Continue');

export const actionTarget = (code: string): string | null => ({
  EDIT_STORE_DETAILS: '/settings/account', CONTACT_SUPPORT: '/help', VERIFY_CONTACT: '/settings/account',
  SET_PRIMARY_CATEGORY: '/settings/account', SUBMIT_APPLICATION: '/marketplace-readiness', UPDATE_APPLICATION: '/marketplace-readiness',
  ADD_PRODUCT: '/products/create', ADD_SKU: '/products', CHOOSE_TEMPLATE: '/store-management',
  CUSTOMIZE_STOREFRONT: '/store-management', REVIEW_STOREFRONT: '/store-management', PREVIEW_STORE: '/products',
  ENABLE_MARKETPLACE: '/marketplace-readiness', REVIEW_PRODUCT_VISIBILITY: '/products', VIEW_MARKETPLACE: '/marketplace-readiness',
  VIEW_STOREFRONT: '/store-management',
}[code] || null);

export const emitActivation = (event: string, fields: Record<string, string | number | boolean> = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('rentify:merchant-activation', { detail: { event, ...fields } }));
};
