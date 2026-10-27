export type OrderChannel = 'marketplace' | 'storefront' | 'pos' | 'invoice';
export type OrderActionCode = 'delivered' | 'delivery_failed' | 'retry_delivery' | 'collect_cod' | 'confirm_refund';
export type OrderAction = { code: OrderActionCode; risk: 'normal' | 'high'; requiresReason: boolean; requiresEvidence: boolean };

export type MerchantOrder = {
  id: string; orderNumber: string; version: number; channel: OrderChannel; status: string;
  fulfillmentStatus: string; createdAt: string; updatedAt: string; currency: string;
  totals: { subtotal: string; discount: string; tax: string; shipping: string; total: string };
  payment: { method: string | null; status: string; codState: string; amount: string; amountDue: string; collectedAmount: string; refundedAmount: string };
  buyer: { name: string; email: string | null; phone: string | null };
  delivery: { province: string | null; district: string | null; commune: string | null; street: string | null; note: string | null; trackingNumber: string | null; estimatedDelivery: string | null; minimized: boolean };
  items: Array<{ id: string; name: string; sku: string | null; variantName: string | null; selectedOptions: Record<string, string>; quantity: number; unitPrice: string; lineTotal: string; currency: string; fulfilledQuantity: number }>;
  invoice: { id: string; number: string; status: string; dueDate: string | null; documentPath: string } | null;
  receipt: { documentPath: string } | null;
  reports: OrderEvent[]; timeline: OrderEvent[]; allowedActions: OrderAction[];
};

export type OrderEvent = { id: string; type: string; amount: string | null; createdAt: string; details: { reason: string | null; resolution: string | null; method: string | null; confirmation: string | null; evidenceCount: number } };
export type OrderFilters = { search: string; channel: string; status: string; dateFrom: string; dateTo: string };
export type OrderLoadState = 'loading' | 'ready' | 'empty' | 'forbidden' | 'conflict' | 'timeout' | 'offline' | 'error';

const en = {
  title: 'Orders', description: 'Manage marketplace, storefront, POS, and invoice sales from one Store workspace.',
  search: 'Search orders or customers', channel: 'Sales channel', status: 'Order status', from: 'From date', to: 'To date', apply: 'Apply filters', clear: 'Clear',
  allChannels: 'All channels', allStatuses: 'All statuses', marketplace: 'Marketplace', storefront: 'Storefront', pos: 'POS', invoice: 'Invoice',
  order: 'Order', customer: 'Customer', payment: 'Payment', fulfillment: 'Fulfillment', total: 'Total', date: 'Date', view: 'View order',
  empty: 'No orders match these filters', emptyBody: 'Clear a filter or check again after your first sale.',
  loading: 'Loading Store orders…', forbidden: 'You cannot view these orders', forbiddenBody: 'Ask the Store owner for the Orders permission.',
  timeout: 'Order loading timed out', timeoutBody: 'No data was changed. Try again.', offline: 'You appear to be offline', offlineBody: 'Reconnect, then retry.',
  error: 'Orders are temporarily unavailable', errorBody: 'Try again safely. Existing order and payment facts were not changed.', retry: 'Try again',
  details: 'Order details', close: 'Close details', items: 'Item and price snapshots', contact: 'Buyer contact', delivery: 'Delivery information',
  amountDue: 'Amount due', collected: 'Collected', refunded: 'Refunded', paymentMethod: 'Method', invoiceLink: 'Open invoice', receiptLink: 'Open receipt',
  timeline: 'Event timeline', reports: 'Returns, complaints, and reports', noReports: 'No return, complaint, or merchant report has been recorded.', noEvents: 'No events recorded yet.',
  actions: 'Available next actions', noActions: 'No server-permitted action is available for the current state.', minimized: 'Completed-order contact details are minimized.',
  actionTitle: 'Confirm order action', cancel: 'Go back', confirm: 'Confirm action', reason: 'Reason', resolution: 'Resolution', retryDelivery: 'Retry delivery', cancelOrder: 'Cancel and restore stock',
  buyerAgreed: 'Buyer agreed to another delivery attempt', amount: 'Amount', method: 'Refund method', confirmation: 'Evidence or confirmation reference',
  action_delivered: 'Mark delivered', action_delivery_failed: 'Record failed delivery', action_retry_delivery: 'Retry delivery', action_collect_cod: 'Confirm COD collected', action_confirm_refund: 'Record refund',
  risk_delivered: 'This records fulfillment only. Payment facts remain unchanged.',
  risk_delivery_failed: 'This records the reason. Cancelling also restores reserved stock; it does not invent a refund.',
  risk_retry_delivery: 'A retry is allowed only after the buyer agrees.',
  risk_collect_cod: 'Confirm only after receiving the exact amount due. This records the COD payment as collected.',
  risk_confirm_refund: 'Confirm only after the refund occurred outside Rentify. This updates the recorded refunded amount.',
  actionSuccess: 'Order updated from the latest server state.', conflict: 'This order changed', conflictBody: 'Refresh the order and review the latest status before trying again.',
  attention: 'Action needs attention', capped: 'Showing the latest 250 orders. Narrow the date range to find older orders.', evidence: 'Evidence files', noStore: 'Create or select a Store before managing orders.',
  status_pending: 'Pending', status_confirmed: 'Confirmed', status_processing: 'Processing', status_fulfilled: 'Fulfilled', status_completed: 'Completed', status_cancelled: 'Cancelled', status_refunded: 'Refunded', status_paid: 'Paid', status_failed: 'Failed', status_delivered: 'Delivered', status_retrying: 'Retrying delivery',
  event_order_created: 'Order created', event_complaint: 'Complaint', event_return_requested: 'Return requested', event_merchant_report: 'Merchant report', event_delivered: 'Delivered', event_delivery_failed: 'Delivery failed', event_retry_delivery: 'Delivery retry', event_collect_cod: 'COD collected', event_confirm_refund: 'Refund confirmed',
};

const kh: typeof en = {
  title: 'ការបញ្ជាទិញ', description: 'គ្រប់គ្រងការលក់ពីទីផ្សាររួម ហាងអនឡាញ POS និងវិក្កយបត្រ ក្នុងកន្លែងធ្វើការរបស់ហាងតែមួយ។',
  search: 'ស្វែងរកការបញ្ជាទិញ ឬអតិថិជន', channel: 'បណ្តាញលក់', status: 'ស្ថានភាពការបញ្ជាទិញ', from: 'ចាប់ពីថ្ងៃ', to: 'ដល់ថ្ងៃ', apply: 'អនុវត្តតម្រង', clear: 'សម្អាត',
  allChannels: 'បណ្តាញទាំងអស់', allStatuses: 'ស្ថានភាពទាំងអស់', marketplace: 'ទីផ្សាររួម', storefront: 'ហាងអនឡាញ', pos: 'POS', invoice: 'វិក្កយបត្រ',
  order: 'ការបញ្ជាទិញ', customer: 'អតិថិជន', payment: 'ការទូទាត់', fulfillment: 'ការបំពេញ', total: 'សរុប', date: 'កាលបរិច្ឆេទ', view: 'មើលការបញ្ជាទិញ',
  empty: 'មិនមានការបញ្ជាទិញត្រូវនឹងតម្រងទេ', emptyBody: 'សម្អាតតម្រង ឬពិនិត្យម្តងទៀតបន្ទាប់ពីការលក់ដំបូង។',
  loading: 'កំពុងផ្ទុកការបញ្ជាទិញរបស់ហាង…', forbidden: 'អ្នកមិនអាចមើលការបញ្ជាទិញទាំងនេះបានទេ', forbiddenBody: 'សូមស្នើសុំសិទ្ធិការបញ្ជាទិញពីម្ចាស់ហាង។',
  timeout: 'ការផ្ទុកការបញ្ជាទិញបានផុតពេល', timeoutBody: 'គ្មានទិន្នន័យណាត្រូវបានកែប្រែទេ។ សូមព្យាយាមម្តងទៀត។', offline: 'អ្នកហាក់ដូចជាគ្មានអ៊ីនធឺណិត', offlineBody: 'សូមភ្ជាប់អ៊ីនធឺណិត ហើយព្យាយាមម្តងទៀត។',
  error: 'ការបញ្ជាទិញមិនអាចប្រើបានបណ្តោះអាសន្ន', errorBody: 'សូមព្យាយាមម្តងទៀតដោយសុវត្ថិភាព។ ទិន្នន័យការបញ្ជាទិញ និងការទូទាត់មិនត្រូវបានកែប្រែទេ។', retry: 'ព្យាយាមម្តងទៀត',
  details: 'ព័ត៌មានលម្អិតការបញ្ជាទិញ', close: 'បិទព័ត៌មានលម្អិត', items: 'ទិន្នន័យផលិតផល និងតម្លៃពេលបញ្ជាទិញ', contact: 'ទំនាក់ទំនងអតិថិជន', delivery: 'ព័ត៌មានដឹកជញ្ជូន',
  amountDue: 'ចំនួនត្រូវបង់', collected: 'បានប្រមូល', refunded: 'បានសងវិញ', paymentMethod: 'វិធីទូទាត់', invoiceLink: 'បើកវិក្កយបត្រ', receiptLink: 'បើកបង្កាន់ដៃ',
  timeline: 'ប្រវត្តិព្រឹត្តិការណ៍', reports: 'ការប្រគល់ ពាក្យបណ្តឹង និងរបាយការណ៍', noReports: 'មិនមានការប្រគល់ ពាក្យបណ្តឹង ឬរបាយការណ៍អាជីវករទេ។', noEvents: 'មិនទាន់មានព្រឹត្តិការណ៍ទេ។',
  actions: 'សកម្មភាពបន្ទាប់ដែលអាចធ្វើបាន', noActions: 'ម៉ាស៊ីនមេមិនអនុញ្ញាតសកម្មភាពសម្រាប់ស្ថានភាពបច្ចុប្បន្នទេ។', minimized: 'ព័ត៌មានទំនាក់ទំនងត្រូវបានកាត់បន្ថយបន្ទាប់ពីការបញ្ជាទិញបានបញ្ចប់។',
  actionTitle: 'បញ្ជាក់សកម្មភាពលើការបញ្ជាទិញ', cancel: 'ត្រឡប់ក្រោយ', confirm: 'បញ្ជាក់សកម្មភាព', reason: 'មូលហេតុ', resolution: 'ដំណោះស្រាយ', retryDelivery: 'ដឹកជញ្ជូនឡើងវិញ', cancelOrder: 'លុបចោល និងស្តារស្តុក',
  buyerAgreed: 'អតិថិជនបានយល់ព្រមឱ្យដឹកជញ្ជូនម្តងទៀត', amount: 'ចំនួនទឹកប្រាក់', method: 'វិធីសងប្រាក់', confirmation: 'ភស្តុតាង ឬលេខយោងបញ្ជាក់',
  action_delivered: 'កត់ត្រាថាបានដឹកជញ្ជូន', action_delivery_failed: 'កត់ត្រាការដឹកជញ្ជូនបរាជ័យ', action_retry_delivery: 'ដឹកជញ្ជូនឡើងវិញ', action_collect_cod: 'បញ្ជាក់ការប្រមូល COD', action_confirm_refund: 'កត់ត្រាការសងប្រាក់',
  risk_delivered: 'វាកត់ត្រាការបំពេញតែប៉ុណ្ណោះ។ ទិន្នន័យទូទាត់មិនប្រែប្រួលទេ។',
  risk_delivery_failed: 'វាកត់ត្រាមូលហេតុ។ ការលុបចោលក៏ស្តារស្តុកដែលបានកក់ ប៉ុន្តែមិនបង្កើតការសងប្រាក់ដោយស្វ័យប្រវត្តិទេ។',
  risk_retry_delivery: 'អាចព្យាយាមឡើងវិញបាន លុះត្រាតែអតិថិជនយល់ព្រម។',
  risk_collect_cod: 'បញ្ជាក់តែបន្ទាប់ពីទទួលចំនួនទឹកប្រាក់ត្រឹមត្រូវ។ វាកត់ត្រា COD ថាបានប្រមូល។',
  risk_confirm_refund: 'បញ្ជាក់តែបន្ទាប់ពីបានសងប្រាក់ក្រៅ Rentify។ វាកែចំនួនដែលបានសងក្នុងកំណត់ត្រា។',
  actionSuccess: 'ការបញ្ជាទិញត្រូវបានធ្វើបច្ចុប្បន្នភាពតាមស្ថានភាពចុងក្រោយពីម៉ាស៊ីនមេ។', conflict: 'ការបញ្ជាទិញនេះបានប្រែប្រួល', conflictBody: 'សូមផ្ទុកឡើងវិញ ហើយពិនិត្យស្ថានភាពចុងក្រោយមុនព្យាយាមម្តងទៀត។',
  attention: 'សកម្មភាពត្រូវការការយកចិត្តទុកដាក់', capped: 'កំពុងបង្ហាញការបញ្ជាទិញ ២៥០ ចុងក្រោយ។ សូមកំណត់កាលបរិច្ឆេទដើម្បីស្វែងរកទិន្នន័យចាស់។', evidence: 'ឯកសារភស្តុតាង', noStore: 'បង្កើត ឬជ្រើសរើសហាង មុនគ្រប់គ្រងការបញ្ជាទិញ។',
  status_pending: 'កំពុងរង់ចាំ', status_confirmed: 'បានបញ្ជាក់', status_processing: 'កំពុងរៀបចំ', status_fulfilled: 'បានបំពេញ', status_completed: 'បានបញ្ចប់', status_cancelled: 'បានលុបចោល', status_refunded: 'បានសងប្រាក់', status_paid: 'បានទូទាត់', status_failed: 'បរាជ័យ', status_delivered: 'បានដឹកជញ្ជូន', status_retrying: 'កំពុងដឹកជញ្ជូនឡើងវិញ',
  event_order_created: 'បានបង្កើតការបញ្ជាទិញ', event_complaint: 'ពាក្យបណ្តឹង', event_return_requested: 'បានស្នើសុំប្រគល់ទំនិញ', event_merchant_report: 'របាយការណ៍អាជីវករ', event_delivered: 'បានដឹកជញ្ជូន', event_delivery_failed: 'ការដឹកជញ្ជូនបរាជ័យ', event_retry_delivery: 'ព្យាយាមដឹកជញ្ជូនឡើងវិញ', event_collect_cod: 'បានប្រមូល COD', event_confirm_refund: 'បានបញ្ជាក់ការសងប្រាក់',
};

export const orderCopy = (language?: string) => language === 'kh' ? kh : en;
export const channelLabel = (channel: string, language?: string) => orderCopy(language)[channel as keyof typeof en] as string || channel;
export const actionLabel = (action: OrderActionCode, language?: string) => orderCopy(language)[`action_${action}` as keyof typeof en] as string;
export const actionRisk = (action: OrderActionCode, language?: string) => orderCopy(language)[`risk_${action}` as keyof typeof en] as string;
export const statusLabel = (status: string, language?: string) => orderCopy(language)[`status_${status}` as keyof typeof en] as string || status.replace(/_/g, ' ');
export const eventLabel = (event: string, language?: string) => orderCopy(language)[`event_${event}` as keyof typeof en] as string || event.replace(/_/g, ' ');

export function loadStateFor(error: unknown): OrderLoadState {
  const status = (error as { status?: number }).status;
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 409) return 'conflict';
  if ((error as Error)?.name === 'TimeoutError') return 'timeout';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return 'error';
}
