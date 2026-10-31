import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, apiErrorMessage } from '../core/auth/auth.service';
import { Page, PlatformOperationsService, Section } from '../services/platform-operations.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';

type Column = { title: string; key: string; kind?: 'date' | 'money' | 'status' };
const definitions: Record<Section, { title: string; subtitle: string; columns: Column[] }> = {
  stores: { title: 'opsText.storesSellerReview', subtitle: 'opsText.coreStoreRecordsAWebsite',
    columns: [{ title: 'opsText.store', key: 'name' }, { title: 'opsText.owner', key: 'owner' },
      { title: 'opsText.category', key: 'primaryCategory' }, { title: 'opsText.website', key: 'website' },
      { title: 'opsText.marketplace', key: 'marketplaceApprovalStatus', kind: 'status' },
      { title: 'opsText.storeStatus', key: 'status', kind: 'status' }] },
  users: { title: 'opsText.platformUsers', subtitle: 'opsText.sharedBuyerAndMerchantAccounts',
    columns: [{ title: 'opsText.name', key: 'name' }, { title: 'opsText.email', key: 'email' },
      { title: 'opsText.phone', key: 'phoneNumber' }, { title: 'opsText.role', key: 'role' },
      { title: 'opsText.verified', key: 'isVerified' }, { title: 'opsText.joined', key: 'createdAt', kind: 'date' }] },
  websites: { title: 'opsText.storefrontWebsites', subtitle: 'opsText.optionalWebsiteChannelLinkedTo',
    columns: [{ title: 'opsText.website', key: 'name' }, { title: 'opsText.domain', key: 'domain' },
      { title: 'opsText.storeId', key: 'storeId' }, { title: 'opsText.status', key: 'status', kind: 'status' },
      { title: 'opsText.lastDeployment', key: 'lastDeployment', kind: 'date' }] },
  templates: { title: 'opsText.storefrontTemplates', subtitle: 'opsText.coreTemplateCatalog',
    columns: [{ title: 'opsText.name', key: 'name' }, { title: 'opsText.category', key: 'category' },
      { title: 'opsText.framework', key: 'framework' }, { title: 'opsText.created', key: 'createdAt', kind: 'date' }] },
  subscriptions: { title: 'opsText.subscriptions', subtitle: 'opsText.coreSubscriptionAccessAndBilling',
    columns: [{ title: 'opsText.subscriptionId', key: 'id' }, { title: 'opsText.websiteId', key: 'websiteId' },
      { title: 'opsText.plan', key: 'Package.name' }, { title: 'opsText.status', key: 'status', kind: 'status' },
      { title: 'opsText.start', key: 'startDate', kind: 'date' }, { title: 'opsText.end', key: 'endDate', kind: 'date' }] },
  packages: { title: 'opsText.plans', subtitle: 'opsText.currentPackageDefinitionsFromCore',
    columns: [{ title: 'opsText.name', key: 'name' }, { title: 'opsText.price', key: 'price', kind: 'money' },
      { title: 'opsText.duration', key: 'duration' }] },
  'plan-payments': { title: 'opsText.planPayments', subtitle: 'opsText.subscriptionPaymentsRecordedByCore',
    columns: [{ title: 'opsText.paymentId', key: 'id' }, { title: 'opsText.userId', key: 'userId' },
      { title: 'opsText.amount', key: 'amount', kind: 'money' }, { title: 'opsText.method', key: 'paymentMethod' },
      { title: 'opsText.status', key: 'status', kind: 'status' }, { title: 'opsText.date', key: 'createdAt', kind: 'date' }] },
  products: { title: 'opsText.sharedCatalog', subtitle: 'opsText.canonicalCommerceProductsAndMarketplace',
    columns: [{ title: 'opsText.product', key: 'name' }, { title: 'opsText.storeId', key: 'storeId' },
      { title: 'opsText.marketplaceCategory', key: 'marketplaceCategory' },
      { title: 'opsText.price', key: 'price', kind: 'money' }, { title: 'opsText.stock', key: 'stockQuantity' },
      { title: 'opsText.listingOverride', key: 'marketplaceVisibility' },
      { title: 'opsText.status', key: 'status', kind: 'status' }] },
  orders: { title: 'opsText.ordersAcrossChannels', subtitle: 'opsText.marketplaceStorefrontAndPosOrder',
    columns: [{ title: 'opsText.order', key: 'orderNumber' }, { title: 'opsText.storeId', key: 'storeId' },
      { title: 'opsText.channel', key: 'salesChannel' }, { title: 'opsText.total', key: 'totalAmount', kind: 'money' },
      { title: 'opsText.payment', key: 'Payment.status', kind: 'status' },
      { title: 'opsText.delivery', key: 'deliveryStatus', kind: 'status' },
      { title: 'opsText.placed', key: 'createdAt', kind: 'date' }] },
  payments: { title: 'opsText.customerPaymentRecords', subtitle: 'opsText.commercePaymentEvidenceCodCash',
    columns: [{ title: 'opsText.paymentId', key: 'id' }, { title: 'opsText.orderId', key: 'orderId' },
      { title: 'opsText.method', key: 'paymentMethod' }, { title: 'opsText.amount', key: 'amount', kind: 'money' },
      { title: 'opsText.status', key: 'status', kind: 'status' }, { title: 'opsText.date', key: 'createdAt', kind: 'date' }] },
  reviews: { title: 'opsText.productReviews', subtitle: 'opsText.buyerFeedbackAndCurrentModeration',
    columns: [{ title: 'opsText.buyer', key: 'buyerName' }, { title: 'opsText.productId', key: 'productId' },
      { title: 'opsText.rating', key: 'rating' }, { title: 'opsText.comment', key: 'comment' },
      { title: 'opsText.status', key: 'status', kind: 'status' }, { title: 'opsText.date', key: 'createdAt', kind: 'date' }] },
  reports: { title: 'opsText.buyerReports', subtitle: 'opsText.orderComplaintsAndReturnRequests',
    columns: [{ title: 'opsText.type', key: 'type' }, { title: 'opsText.orderId', key: 'orderId' },
      { title: 'opsText.storeId', key: 'storeId' }, { title: 'opsText.reason', key: 'details.reason' },
      { title: 'opsText.status', key: 'details.status', kind: 'status' },
      { title: 'opsText.date', key: 'createdAt', kind: 'date' }] },
  billing: { title: 'opsText.usageStatements', subtitle: 'opsText.commerceUsageBillingDistinctFrom',
    columns: [{ title: 'opsText.statementId', key: 'id' }, { title: 'opsText.storeId', key: 'storeId' },
      { title: 'opsText.month', key: 'month' }, { title: 'opsText.amount', key: 'totalAmount', kind: 'money' },
      { title: 'opsText.status', key: 'status', kind: 'status' }] },
};
const checklist = [
  ['accountVerified', 'opsText.check.accountVerified'],
  ['identityReviewed', 'opsText.check.identityReviewed'],
  ['storeDetailsReviewed', 'opsText.check.storeDetailsReviewed'],
  ['sampleProductReviewed', 'opsText.check.sampleProductReviewed'],
  ['fulfillmentReviewed', 'opsText.check.fulfillmentReviewed'],
  ['restrictedProductsReviewed', 'opsText.check.restrictedProductsReviewed'],
] as const;

@Component({
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  template: `
    @if (section === 'dashboard') {
      <div class="page-head"><div><p class="ops-eyebrow">{{ 'ops.eyebrow' | translate }}</p><h1 class="page-title">{{ 'ops.platformOverview' | translate }}</h1><p class="page-sub">{{ 'ops.overviewLead' | translate }}</p></div></div>
      @if (coreError()) { <div class="ops-alert">Core unavailable: {{coreError()}}</div> }
      @if (commerceError()) { <div class="ops-alert">Commerce unavailable: {{commerceError()}}</div> }
      <div class="ops-stats">
        <a routerLink="/stores"><small>{{ 'ops.stores' | translate }}</small><strong>{{coreOverview()?.['storeCount'] ?? '—'}}</strong><span>{{coreOverview()?.['activeStores'] ?? '—'}} active</span></a>
        <a routerLink="/stores" [queryParams]="{status:'pending'}"><small>{{ 'ops.pendingSellerApplications' | translate }}</small><strong>{{coreOverview()?.['pendingSellers'] ?? '—'}}</strong><span>{{ 'ops.approvalGates' | translate }}</span></a>
        <a routerLink="/websites"><small>{{ 'ops.storefrontWebsites' | translate }}</small><strong>{{coreOverview()?.['websiteCount'] ?? '—'}}</strong><span>{{ 'ops.optionalSalesChannel' | translate }}</span></a>
        <a routerLink="/users"><small>{{ 'nav.users' | translate }}</small><strong>{{coreOverview()?.['userCount'] ?? '—'}}</strong><span>{{ 'ops.sharedIdentity' | translate }}</span></a>
        <a routerLink="/products"><small>{{ 'ops.catalogProducts' | translate }}</small><strong>{{commerceOverview()?.['productCount'] ?? '—'}}</strong><span>{{ 'ops.canonicalProducts' | translate }}</span></a>
        <a routerLink="/orders"><small>{{ 'ops.marketplaceOrders' | translate }}</small><strong>{{commerceOverview()?.['marketplaceOrders'] ?? '—'}}</strong><span>{{commerceOverview()?.['openMarketplaceOrders'] ?? '—'}} open</span></a>
        <a routerLink="/reports"><small>{{ 'ops.buyerReports' | translate }}</small><strong>{{commerceOverview()?.['buyerReports'] ?? '—'}}</strong><span>{{ 'ops.complaintsAndReturns' | translate }}</span></a>
        <a routerLink="/subscriptions"><small>{{ 'ops.activeSubscriptions' | translate }}</small><strong>{{coreOverview()?.['activeSubscriptions'] ?? '—'}}</strong><span>{{coreOverview()?.['pendingPlanPayments'] ?? '—'}} plan payments pending</span></a>
      </div>
      <div class="ops-panels">
        <section class="card">
          <div class="ops-panel-head"><div><h2>{{ 'ops.priorityQueue' | translate }}</h2><p>{{ 'ops.priorityQueueLead' | translate }}</p></div><a [routerLink]="queueTab() === 'sellers' ? '/stores' : queueTab() === 'reviews' ? '/reviews' : '/reports'">View all →</a></div>
          <div class="ops-queue-tabs">
            <button class="ops-queue-tab" [class.active]="queueTab() === 'sellers'" (click)="queueTab.set('sellers')">Pending Sellers ({{pendingStores().length}})</button>
            <button class="ops-queue-tab" [class.active]="queueTab() === 'reviews'" (click)="queueTab.set('reviews')">Flagged Reviews ({{flaggedReviews().length}})</button>
            <button class="ops-queue-tab" [class.active]="queueTab() === 'reports'" (click)="queueTab.set('reports')">Buyer Reports ({{openReports().length}})</button>
          </div>
          @if (queueTab() === 'sellers') {
            @for (store of pendingStores(); track store.id) { <button class="ops-queue-row" (click)="openItem(store, 'stores')"><span class="thumb">{{store.name[0]}}</span><span><b>{{store.name}}</b><small>{{store.primaryCategory || ('ops.categoryMissing' | translate)}} · {{store.owner?.email || ('ops.noEmail' | translate)}}</small></span><em>{{ 'ops.reviewArrow' | translate }}</em></button> }
            @empty { <p class="ops-empty">{{queueError() || ('ops.noPendingApplications' | translate)}}</p> }
          }
          @if (queueTab() === 'reviews') {
            @for (rev of flaggedReviews(); track rev.id) { <button class="ops-queue-row" (click)="openItem(rev, 'reviews')"><span class="thumb">★</span><span><b>{{rev.buyerName}} ({{rev.rating}}★)</b><small>{{rev.comment || ('ops.noComment' | translate)}}</small></span><em>{{ 'ops.moderateArrow' | translate }}</em></button> }
            @empty { <p class="ops-empty">{{ 'ops.noFlaggedReviews' | translate }}</p> }
          }
          @if (queueTab() === 'reports') {
            @for (rep of openReports(); track rep.id) { <button class="ops-queue-row" (click)="openItem(rep, 'reports')"><span class="thumb">⚠</span><span><b>{{label(rep.type)}} · {{ 'ops.orderShort' | translate: { id: rep.orderId?.slice(0,8) ?? '' } }}</b><small>{{rep.details?.reason || ('ops.noDetails' | translate)}}</small></span><em>{{ 'ops.triageArrow' | translate }}</em></button> }
            @empty { <p class="ops-empty">{{ 'ops.noOpenReports' | translate }}</p> }
          }
        </section>
        <section class="card"><div class="ops-panel-head"><div><h2>{{ 'ops.paymentBoundary' | translate }}</h2><p>{{ 'ops.launchModel' | translate }}</p></div></div><div class="ops-copy"><p>{{ 'ops.codModel' | translate }}</p><p>{{ 'ops.futureSettlement' | translate }}</p></div></section>
      </div>
    } @else {
      <div class="page-head"><div><p class="ops-eyebrow">{{coreSource ? 'CORE' : 'COMMERCE'}} / {{ 'ops.live' | translate }}</p><h1 class="page-title">{{definition.title | translate}}</h1><p class="page-sub">{{definition.subtitle | translate}}</p></div></div>
      @if (storeFilter) { <div class="ops-filter">Filtered to Store {{storeFilter}} <a [routerLink]="'/' + section">{{ 'common.clear' | translate }}</a></div> }
      <div class="ops-toolbar"><form (submit)="search($event)"><input class="input" [attr.aria-label]="'ops.searchRecords' | translate" [placeholder]="'ops.searchRecords' | translate" [value]="query()" (input)="query.set($any($event.target).value)"><button class="btn btn-primary" type="submit">{{ 'common.search' | translate }}</button></form>
        @if (section === 'stores') { <select class="input" [attr.aria-label]="'ops.approvalStatus' | translate" [value]="status()" (change)="changeStatus($any($event.target).value)"><option value="">{{ 'ops.allApprovalStates' | translate }}</option><option value="pending">{{ 'ops.pendingApplication' | translate }}</option><option value="approved">{{ 'ops.approved' | translate }}</option><option value="needs_changes">{{ 'ops.needsChanges' | translate }}</option><option value="rejected">{{ 'ops.rejected' | translate }}</option><option value="suspended">{{ 'ops.suspended' | translate }}</option></select> }
        @if (section === 'orders') { <select class="input" [attr.aria-label]="'ops.salesChannel' | translate" [value]="channel()" (change)="changeChannel($any($event.target).value)"><option value="">{{ 'ops.allChannels' | translate }}</option><option value="marketplace">{{ 'ops.marketplace' | translate }}</option><option value="storefront">{{ 'ops.storefront' | translate }}</option><option value="pos">{{ 'ops.pos' | translate }}</option></select> }
        @if (section === 'products') {
          <select class="input" [attr.aria-label]="'ops.productStatus' | translate" [value]="status()" (change)="changeStatus($any($event.target).value)"><option value="">{{ 'ops.allCatalogStatuses' | translate }}</option><option value="active">{{ 'common.active' | translate }}</option><option value="draft">{{ 'ops.draft' | translate }}</option><option value="archived">{{ 'ops.archivedHeld' | translate }}</option><option value="out_of_stock">{{ 'ops.outOfStock' | translate }}</option><option value="low_stock">{{ 'ops.lowStock' | translate }}</option></select>
          <select class="input" [attr.aria-label]="'ops.listingOverrideFilter' | translate" [value]="visibility()" (change)="changeVisibility($any($event.target).value)"><option value="">{{ 'ops.allVisibilityStates' | translate }}</option><option value="listed">{{ 'ops.forceOn' | translate }}</option><option value="held">{{ 'ops.forceOff' | translate }}</option><option value="default">{{ 'ops.storeDefault' | translate }}</option></select>
        }
        @if (section === 'reviews') { <select class="input" [attr.aria-label]="'ops.reviewStatus' | translate" [value]="status()" (change)="changeStatus($any($event.target).value)"><option value="">{{ 'ops.allReviewStatuses' | translate }}</option><option value="flagged">{{ 'ops.flagged' | translate }}</option><option value="published">{{ 'ops.published' | translate }}</option><option value="hidden">{{ 'ops.hidden' | translate }}</option></select> }
        @if (section === 'reports') { <select class="input" [attr.aria-label]="'ops.triageStatus' | translate" [value]="status()" (change)="changeStatus($any($event.target).value)"><option value="">{{ 'ops.allTriageStatuses' | translate }}</option><option value="open">{{ 'status.open' | translate }}</option><option value="investigating">{{ 'ops.investigating' | translate }}</option><option value="resolved">{{ 'status.resolved' | translate }}</option><option value="dismissed">{{ 'status.dismissed' | translate }}</option></select> }
      </div>
      @if (error()) { <div class="ops-alert">{{error()}} <button class="btn btn-default btn-sm" (click)="load()">{{ 'common.retry' | translate }}</button></div> }
      @if (loading()) { <div class="card ops-empty">{{ 'ops.loadingLiveRecords' | translate }}</div> }
      @if (!loading() && !error()) {
        <div class="card ops-table-scroll"><table class="tbl"><thead><tr>@for (column of definition.columns; track column.title) { <th>{{column.title | translate}}</th> } @if (actionable.has(section)) { <th>{{ 'common.action' | translate }}</th> }</tr></thead><tbody>
          @for (row of rows(); track row.id) { <tr>@for (column of definition.columns; track column.title) { <td><span [class.ops-pill]="column.kind === 'status'" [class]="statusClass(row, column)">{{cell(row, column)}}</span></td> }
            @if (actionable.has(section)) { <td><button class="btn btn-default btn-sm" (click)="openItem(row, section)">{{ 'ops.inspect' | translate }}</button></td> }
          </tr> } @empty { <tr><td colspan="10"><p class="ops-empty">{{ 'ops.noMatchingRecords' | translate }}</p></td></tr> }
        </tbody></table></div>
        <div class="ops-pagination"><span>{{total()}} records · page {{page()}} of {{pages()}}</span><div><button class="btn btn-default btn-sm" [disabled]="page() <= 1" (click)="goPage(page()-1)">{{ 'common.previous' | translate }}</button><button class="btn btn-default btn-sm" [disabled]="page() >= pages()" (click)="goPage(page()+1)">{{ 'common.next' | translate }}</button></div></div>
      }
    }
    @if (selected(); as item) {
      <div class="drawer-back" (click)="selected.set(null)"></div><aside class="drawer ops-drawer"><div class="drawer-head"><b>{{item.name || item.orderNumber || item.buyerName || item.type || item.id}}</b><button class="icon-btn" [attr.aria-label]="'common.close' | translate" (click)="selected.set(null)">✕</button></div><div class="drawer-body">
        @if (actionSuccess()) { <div class="ops-success">{{actionSuccess()}}</div> }
        @if (decisionError()) { <div class="ops-alert">{{decisionError()}}</div> }

        @if (drawerSection() === 'stores' || drawerSection() === 'dashboard') {
          <div class="ops-facts"><span>{{ 'ops.storeId' | translate }}</span><b>{{item.id}}</b><span>{{ 'ops.owner' | translate }}</span><b>{{item.owner?.name || '—'}}</b><span>{{ 'ops.contact' | translate }}</span><b>{{item.owner?.email || item.owner?.phoneNumber || '—'}}</b><span>{{ 'ops.contactVerified' | translate }}</span><b>{{item.owner?.isVerified ? 'Yes' : 'No'}}</b><span>{{ 'moderation.productCategory' | translate }}</span><b>{{item.primaryCategory || 'Missing'}}</b><span>{{ 'ops.website' | translate }}</span><b>{{item.website?.name || 'Marketplace only'}}</b><span>{{ 'ops.marketplaceEnabled' | translate }}</span><b>{{item.marketplaceEnabled ? 'Yes' : 'Opted out'}}</b><span>{{ 'ops.approval' | translate }}</span><b>{{label(item.marketplaceApprovalStatus)}}</b><span>{{ 'ops.storeStatus' | translate }}</span><b>{{label(item.status)}}</b></div>
          <div class="ops-actions">
            <button class="btn btn-default btn-sm" [disabled]="saving() || !canReviewSellers()" (click)="toggleStoreMarketplace(item, !item.marketplaceEnabled)">{{item.marketplaceEnabled ? 'Opt Out of Marketplace' : 'Enable Marketplace Listing'}}</button>
            <button class="btn btn-sm" [class.btn-danger]="item.status === 'active'" [class.btn-primary]="item.status !== 'active'" [disabled]="saving() || !canReviewSellers()" (click)="toggleStoreStatus(item, item.status === 'active' ? 'suspended' : 'active')">{{item.status === 'active' ? 'Suspend Store' : 'Reactivate Store'}}</button>
          </div>
          <div class="ops-links" style="margin-top:14px;"><a [routerLink]="['/products']" [queryParams]="{storeId:item.id}" (click)="selected.set(null)">Products →</a><a [routerLink]="['/orders']" [queryParams]="{storeId:item.id}" (click)="selected.set(null)">Orders →</a></div>
          <h3>{{ 'ops.sellerApplication' | translate }}</h3>
          @if (item.sellerApplication; as app) {
            <div class="ops-facts"><span>{{ 'ops.responsiblePerson' | translate }}</span><b>{{app.responsibleName}}</b><span>{{ 'ops.pickup' | translate }}</span><b>{{app.pickupLocation}}</b><span>{{ 'ops.buyerContact' | translate }}</span><b>{{app.buyerContact}}</b><span>{{ 'ops.sampleProduct' | translate }}</span><b>{{app.sampleProductDescription}}</b></div>
            <h3>{{ 'ops.approvalChecklist' | translate }}</h3><p class="cell-sub">{{ 'ops.checklistNote' | translate }}</p>
            @for (check of checklist; track check[0]) { <label class="ops-check"><input type="checkbox" [checked]="checks()[check[0]]" (change)="setCheck(check[0], $any($event.target).checked)">{{check[1] | translate}}</label> }
            <label class="ops-field">{{ 'ops.reasonChanges' | translate }}<textarea class="input" rows="3" [value]="reason()" (input)="reason.set($any($event.target).value)"></textarea></label>
            <div class="ops-actions"><button class="btn btn-primary" [disabled]="saving() || !canApprove(item)" (click)="decide(item,'approved')">{{ 'ops.approve' | translate }}</button><button class="btn btn-default" [disabled]="saving() || !canReviewSellers()" (click)="decide(item,'needs_changes')">{{ 'ops.needsChanges' | translate }}</button><button class="btn btn-danger" [disabled]="saving() || !canReviewSellers()" (click)="decide(item,item.marketplaceApprovalStatus === 'approved' ? 'suspended' : 'rejected')">{{item.marketplaceApprovalStatus === 'approved' ? 'Suspend' : 'Reject'}}</button></div>
          } @else {
            <p class="ops-empty">{{ 'ops.noApplication' | translate }}</p>
            <div class="ops-actions">
              <button class="btn btn-primary btn-sm" [disabled]="saving() || !canReviewSellers()" (click)="decide(item,'approved')">{{ 'ops.preApproveStore' | translate }}</button>
              <button class="btn btn-danger btn-sm" [disabled]="saving() || !canReviewSellers()" (click)="decide(item,'suspended')">{{ 'ops.suspendSeller' | translate }}</button>
            </div>
          }
          <h3>{{ 'ops.reviewHistory' | translate }}</h3>@for (review of history(); track review.id) { <div class="ops-history"><b>{{label(review.decision)}}</b><span>{{date(review.createdAt)}}</span><p>{{review.reason || 'Checklist approved'}}</p></div> } @empty { <p class="cell-sub">{{ 'ops.noManualReviews' | translate }}</p> }
        }

        @if (drawerSection() === 'products') {
          <div class="ops-facts"><span>{{ 'ops.productId' | translate }}</span><b>{{item.id}}</b><span>{{ 'ops.storeId' | translate }}</span><b>{{item.storeId || '—'}}</b><span>{{ 'ops.slug' | translate }}</span><b>{{item.slug || '—'}}</b><span>{{ 'moderation.productCategory' | translate }}</span><b>{{item.marketplaceCategory || '—'}}</b><span>{{ 'moderation.productPrice' | translate }}</span><b>{{money(item.price)}}</b><span>{{ 'ops.stock' | translate }}</span><b>{{item.stockQuantity}} units</b><span>{{ 'common.status' | translate }}</span><b>{{label(item.status)}}</b><span>{{ 'ops.listingOverride' | translate }}</span><b>{{item.marketplaceVisibility === null ? 'Store default' : item.marketplaceVisibility ? 'Force On' : 'Force Off (Held)'}}</b><span>{{ 'common.created' | translate }}</span><b>{{date(item.createdAt)}}</b></div>
          <h3>{{ 'ops.listingControls' | translate }}</h3>
          <p class="cell-sub">{{ 'ops.holdNote' | translate }}</p>
          <div class="ops-actions">
            <button class="btn btn-primary btn-sm" [disabled]="saving() || !canModerateCatalog()" (click)="setProductVisibility(item, true)">{{ 'ops.forceList' | translate }}</button>
            <button class="btn btn-danger btn-sm" [disabled]="saving() || !canModerateCatalog()" (click)="setProductVisibility(item, false)">{{ 'ops.holdDelist' | translate }}</button>
            <button class="btn btn-default btn-sm" [disabled]="saving() || !canModerateCatalog()" (click)="setProductVisibility(item, null)">{{ 'ops.inheritDefault' | translate }}</button>
          </div>
          <h3>{{ 'ops.catalogStatus' | translate }}</h3>
          <div class="ops-actions">
            <button class="btn btn-default btn-sm" [disabled]="saving() || item.status === 'active' || !canModerateCatalog()" (click)="setProductStatus(item, 'active')">{{ 'ops.setActive' | translate }}</button>
            <button class="btn btn-default btn-sm" [disabled]="saving() || item.status === 'archived' || !canModerateCatalog()" (click)="setProductStatus(item, 'archived')">{{ 'ops.archiveTakedown' | translate }}</button>
          </div>
          <h3>{{ 'ops.inventoryRestock' | translate }}</h3>
          <div class="ops-actions">
            <button class="btn btn-default btn-sm" [disabled]="saving() || !canAdjustInventory()" (click)="restockProduct(item, 20)">+20 Units Restock</button>
          </div>
          <div class="ops-links" style="margin-top:16px;"><a [routerLink]="['/orders']" [queryParams]="{storeId:item.storeId}" (click)="selected.set(null)">Store orders →</a></div>
        }

        @if (drawerSection() === 'reviews') {
          <div class="ops-facts"><span>{{ 'ops.reviewId' | translate }}</span><b>{{item.id}}</b><span>{{ 'support.msgSenderBuyer' | translate }}</span><b>{{item.buyerName}}</b><span>{{ 'ops.productId' | translate }}</span><b>{{item.productId}}</b><span>{{ 'ops.storeId' | translate }}</span><b>{{item.storeId}}</b><span>{{ 'ops.rating' | translate }}</span><b>{{item.rating}} / 5 ★</b><span>{{ 'ops.verifiedBuyer' | translate }}</span><b>{{item.isVerifiedPurchase ? 'Yes' : 'No'}}</b><span>{{ 'common.status' | translate }}</span><b>{{label(item.status)}}</b><span>{{ 'common.date' | translate }}</span><b>{{date(item.createdAt)}}</b></div>
          <h3>{{ 'ops.reviewComment' | translate }}</h3>
          <div class="ops-copy" style="background:#f8fafc; border:1px solid var(--line); border-radius:8px; margin:10px 0;"><p>{{item.comment || ('ops.noCommentText' | translate)}}</p></div>
          <h3>{{ 'ops.moderationActions' | translate }}</h3>
          <div class="ops-actions">
            <button class="btn btn-primary btn-sm" [disabled]="saving() || item.status === 'published' || !canModerateReviews()" (click)="setReviewStatus(item, 'published')">{{ 'ops.approvePublish' | translate }}</button>
            <button class="btn btn-default btn-sm" [disabled]="saving() || item.status === 'flagged' || !canModerateReviews()" (click)="setReviewStatus(item, 'flagged')">{{ 'ops.flagForReview' | translate }}</button>
            <button class="btn btn-default btn-sm" [disabled]="saving() || item.status === 'hidden' || !canModerateReviews()" (click)="setReviewStatus(item, 'hidden')">{{ 'ops.hideReview' | translate }}</button>
            <button class="btn btn-danger btn-sm" [disabled]="saving() || !canModerateReviews()" (click)="removeReview(item)">{{ 'ops.deleteReview' | translate }}</button>
          </div>
        }

        @if (drawerSection() === 'reports') {
          <div class="ops-facts"><span>{{ 'ops.reportId' | translate }}</span><b>{{item.id}}</b><span>{{ 'ops.orderId' | translate }}</span><b>{{item.orderId}}</b><span>{{ 'ops.storeId' | translate }}</span><b>{{item.storeId}}</b><span>{{ 'ops.actorId' | translate }}</span><b>{{item.actorId}}</b><span>{{ 'ops.reportType' | translate }}</span><b>{{label(item.type)}}</b><span>{{ 'ops.currentStatus' | translate }}</span><b>{{label(item.details?.status || 'open')}}</b><span>{{ 'ops.reported' | translate }}</span><b>{{date(item.createdAt)}}</b></div>
          <h3>{{ 'ops.complaintDetails' | translate }}</h3>
          <div class="ops-copy" style="background:#fffcf5; border:1px solid #fed7aa; border-radius:8px; margin:10px 0;"><p>{{item.details?.reason || ('ops.noComplaintReason' | translate)}}</p></div>
          @if (item.details?.resolvedAt) {
            <h3>{{ 'ops.resolutionRecorded' | translate }}</h3>
            <div class="ops-history"><b>{{ 'ops.resolvedBy' | translate: { name: item.details.resolvedBy } }}</b><span>{{date(item.details.resolvedAt)}}</span><p>{{item.details.resolutionNotes || ('ops.resolvedNoNotes' | translate)}}</p></div>
          }
          <h3>{{ 'ops.triageResolution' | translate }}</h3>
          <label class="ops-field">{{ 'ops.resolutionNotes' | translate }}<textarea class="input" rows="3" [value]="resolutionNotes()" (input)="resolutionNotes.set($any($event.target).value)" [placeholder]="'ops.findingsPlaceholder' | translate"></textarea></label>
          <div class="ops-actions">
            <button class="btn btn-default btn-sm" [disabled]="saving() || !canWriteSupport()" (click)="triageReport(item, 'investigating')">{{ 'ops.markInvestigating' | translate }}</button>
            <button class="btn btn-primary btn-sm" [disabled]="saving() || !canWriteSupport()" (click)="triageReport(item, 'resolved')">{{ 'ops.resolveReport' | translate }}</button>
            <button class="btn btn-danger btn-sm" [disabled]="saving() || !canWriteSupport()" (click)="triageReport(item, 'dismissed')">{{ 'ops.dismissReport' | translate }}</button>
            <a class="btn btn-default btn-sm" [routerLink]="['/orders']" [queryParams]="{storeId: item.storeId}" (click)="selected.set(null)">Store orders →</a>
          </div>
        }

        @if (drawerSection() === 'orders') {
          <div class="ops-facts"><span>{{ 'ops.orderId' | translate }}</span><b>{{item.id}}</b><span>{{ 'ops.buyerId' | translate }}</span><b>{{item.buyerId || '—'}}</b><span>{{ 'ops.storeId' | translate }}</span><b>{{item.storeId}}</b><span>{{ 'ops.channel' | translate }}</span><b>{{label(item.salesChannel)}}</b><span>{{ 'common.status' | translate }}</span><b>{{label(item.status)}}</b><span>{{ 'ops.delivery' | translate }}</span><b>{{label(item.deliveryStatus)}}</b><span>{{ 'ops.payment' | translate }}</span><b>{{item.Payment?.paymentMethod || '—'}} · {{item.Payment?.status || '—'}}</b><span>{{ 'ops.deliveryFee' | translate }}</span><b>{{money(item.shippingFee,item.currency)}}</b><span>{{ 'ops.total' | translate }}</span><b>{{money(item.totalAmount,item.currency)}}</b></div>
          <h3>{{ 'ops.items' | translate }}</h3>
          @for (part of item.OrderItems || []; track part.id) { <div class="ops-history"><b>{{part.name}}</b><span>× {{part.quantity}} · {{money(part.total,item.currency)}}</span></div> }
        }
      </div></aside>
    }
  `,
})
export class OperationsComponent implements OnInit {
  private readonly api = inject(PlatformOperationsService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService, { optional: true });

  readonly canReviewSellers = computed(() => (this.auth?.user() ? this.auth.canReviewSellers() : true));
  readonly canModerateCatalog = computed(() => (this.auth?.user() ? this.auth.canModerateCatalog() : true));
  readonly canModerateReviews = computed(() => (this.auth?.user() ? this.auth.canModerateReviews() : true));
  readonly canAdjustInventory = computed(() => (this.auth?.user() ? this.auth.canAdjustInventory() : true));
  readonly canWriteSupport = computed(() => (this.auth?.user() ? this.auth.canWriteSupport() : true));

  readonly section = this.route.snapshot.data['section'] as Section | 'dashboard';
  readonly coreSource = new Set(['stores', 'users', 'websites', 'templates', 'subscriptions',
    'packages', 'plan-payments']).has(this.section);
  readonly definition = definitions[this.section as Section];
  readonly checklist = checklist;
  readonly actionable = new Set(['stores', 'products', 'orders', 'reviews', 'reports']);
  readonly storeFilter = this.route.snapshot.queryParamMap.get('storeId') || '';
  readonly query = signal(this.route.snapshot.queryParamMap.get('q') || '');
  readonly status = signal(this.route.snapshot.queryParamMap.get('status') || '');
  readonly channel = signal('');
  readonly visibility = signal('');
  readonly rows = signal<any[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selected = signal<any | null>(null);
  readonly drawerSection = signal<string>('');
  readonly history = signal<any[]>([]);
  readonly checks = signal<Record<string, boolean>>(Object.fromEntries(checklist.map(([key]) => [key, false])));
  readonly reason = signal('');
  readonly resolutionNotes = signal('');
  readonly saving = signal(false);
  readonly decisionError = signal('');
  readonly actionSuccess = signal('');
  readonly coreOverview = signal<Record<string, number> | null>(null);
  readonly commerceOverview = signal<Record<string, number> | null>(null);
  readonly coreError = signal('');
  readonly commerceError = signal('');
  readonly pendingStores = signal<any[]>([]);
  readonly flaggedReviews = signal<any[]>([]);
  readonly openReports = signal<any[]>([]);
  readonly queueTab = signal<'sellers' | 'reviews' | 'reports'>('sellers');
  readonly queueError = signal('');

  ngOnInit() { this.load(); }
  pages() { return Math.max(1, Math.ceil(this.total() / 20)); }
  date(value: string | null) { return value ? new Date(value).toLocaleDateString() : '—'; }
  money(value: string | number, currency = 'USD') { return `${currency} ${Number(value || 0).toFixed(2)}`; }
  // Backend status codes get a catalog label (status.<code>); unknown codes fall back to Title Case.
  label(value: string) {
    const key = `status.${value}`;
    const text = value ? this.translate.t(key) : key;
    if (text !== key) return text;
    return String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
  }
  visibilityLabel(value: boolean | null | undefined): string {
    return this.translate.t(value === null || value === undefined ? 'ops.storeDefault' : value ? 'ops.forceOnShort' : 'ops.forceOffHeld');
  }
  cell(row: any, column: Column): string {
    if (column.key === 'owner') return row.owner?.email || row.owner?.phoneNumber || '—';
    if (column.key === 'website') return row.website?.name || this.translate.t('ops.marketplaceOnly');
    if (column.key === 'details.status') return this.label(row.details?.status || 'open');
    if (column.key === 'details.reason') return row.details?.reason || '—';
    const value = column.key.split('.').reduce((part, key) => part?.[key], row);
    if (column.key === 'isVerified') return this.translate.t(value ? 'common.yes' : 'common.no');
    if (column.key === 'marketplaceVisibility') return this.visibilityLabel(value);
    if (column.kind === 'date') return this.date(value);
    if (column.kind === 'money') return this.money(value, row.currency || 'USD');
    if (column.kind === 'status') return this.label(value);
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }
  statusClass(row: any, column: Column): string {
    if (column.kind !== 'status') return '';
    if (column.key === 'details.status') return row.details?.status || 'open';
    return String(column.key.split('.').reduce((part, key) => part?.[key], row) || '');
  }
  search(event: Event) { event.preventDefault(); this.page.set(1); this.load(); }
  changeStatus(value: string) { this.status.set(value); this.page.set(1); this.load(); }
  changeChannel(value: string) { this.channel.set(value); this.page.set(1); this.load(); }
  changeVisibility(value: string) { this.visibility.set(value); this.page.set(1); this.load(); }
  goPage(value: number) { this.page.set(value); this.load(); }
  load() {
    if (this.section === 'dashboard') { this.loadOverview(); return; }
    this.loading.set(true); this.error.set('');
    const params = { page: this.page(), limit: 20, q: this.query().trim(),
      storeId: this.storeFilter || undefined, status: this.status() || undefined,
      applicationStatus: this.section === 'stores' && this.status() === 'pending' ? 'pending' : undefined,
      visibility: this.section === 'products' ? (this.visibility() || undefined) : undefined,
      channel: this.channel() || undefined };
    const request = this.coreSource
      ? this.api.core<Page<any>>(this.section, params)
      : this.api.commerce<Page<any>>(this.section, params);
    request.subscribe({ next: (result) => { this.rows.set(result.data); this.total.set(result.total); this.loading.set(false); },
      error: (e) => { this.rows.set([]); this.total.set(0);
        this.error.set(apiErrorMessage(e, this.translate.t('ops.err.loadRecords'))); this.loading.set(false); } });
  }
  private loadOverview() {
    this.api.core<{data:Record<string,number>}>('overview').subscribe({
      next: (r) => this.coreOverview.set(r.data),
      error: (e) => this.coreError.set(apiErrorMessage(e, this.translate.t('ops.err.core'))) });
    this.api.commerce<{data:Record<string,number>}>('overview').subscribe({
      next: (r) => this.commerceOverview.set(r.data),
      error: (e) => this.commerceError.set(apiErrorMessage(e, this.translate.t('ops.err.commerce'))) });
    this.api.core<Page<any>>('stores', { applicationStatus: 'pending', limit: 5 }).subscribe({
      next: (r) => this.pendingStores.set(r.data),
      error: (e) => this.queueError.set(apiErrorMessage(e, this.translate.t('ops.err.queue'))) });
    this.api.commerce<Page<any>>('reviews', { status: 'flagged', limit: 5 }).subscribe({
      next: (r) => this.flaggedReviews.set(r.data),
      error: () => {} });
    this.api.commerce<Page<any>>('reports', { status: 'open', limit: 5 }).subscribe({
      next: (r) => this.openReports.set(r.data),
      error: () => {} });
  }
  openItem(item: any, sectionName: string = this.section) {
    this.drawerSection.set(sectionName);
    this.selected.set(item);
    this.actionSuccess.set('');
    this.decisionError.set('');
    this.resolutionNotes.set(item.details?.resolutionNotes || '');
    if (sectionName === 'stores' || sectionName === 'dashboard') {
      this.openStore(item);
    }
  }
  openStore(store: any) {
    this.selected.set(store); this.history.set([]); this.reason.set(''); this.decisionError.set('');
    this.actionSuccess.set('');
    this.checks.set(Object.fromEntries(checklist.map(([key]) => [key, false])));
    if (store.sellerApplication) this.api.reviewHistory(store.id).subscribe({
      next: (r) => this.history.set(r.data.reviews),
      error: (e) => this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.history'))) });
  }
  setCheck(key: string, value: boolean) { this.checks.update((old) => ({ ...old, [key]: value })); }
  canApprove(store: any) {
    return Boolean(this.canReviewSellers() && store.sellerApplication && store.owner?.isVerified && store.primaryCategory &&
      !store.needsCategoryReview && checklist.every(([key]) => this.checks()[key]));
  }
  decide(store: any, decision: string) {
    if (decision === 'approved' && store.sellerApplication && !this.canApprove(store)) return;
    this.saving.set(true); this.decisionError.set('');
    this.api.reviewSeller(store.id, decision, this.checks(), this.reason().trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.actionSuccess.set(this.translate.t('ops.ok.sellerStatus', { status: this.label(decision) }));
        store.marketplaceApprovalStatus = decision;
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.sellerDecision'))); },
    });
  }
  toggleStoreMarketplace(store: any, enabled: boolean) {
    this.saving.set(true); this.decisionError.set('');
    this.api.updateStore(store.id, { marketplaceEnabled: enabled }).subscribe({
      next: () => {
        this.saving.set(false);
        store.marketplaceEnabled = enabled;
        this.actionSuccess.set(this.translate.t(enabled ? 'ops.ok.listingEnabled' : 'ops.ok.listingOptedOut'));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.listingSetting'))); }
    });
  }
  toggleStoreStatus(store: any, status: 'active' | 'suspended') {
    this.saving.set(true); this.decisionError.set('');
    this.api.updateStore(store.id, { status }).subscribe({
      next: () => {
        this.saving.set(false);
        store.status = status;
        this.actionSuccess.set(this.translate.t('ops.ok.storeStatus', { status: this.label(status) }));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.storeStatus'))); }
    });
  }
  setProductVisibility(product: any, marketplaceVisibility: boolean | null) {
    this.saving.set(true); this.decisionError.set('');
    this.api.updateProduct(product.id, { marketplaceVisibility }).subscribe({
      next: () => {
        this.saving.set(false);
        product.marketplaceVisibility = marketplaceVisibility;
        this.actionSuccess.set(this.translate.t('ops.ok.listingOverride', { value: this.visibilityLabel(marketplaceVisibility) }));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.visibility'))); }
    });
  }
  setProductStatus(product: any, status: string) {
    this.saving.set(true); this.decisionError.set('');
    this.api.updateProduct(product.id, { status }).subscribe({
      next: () => {
        this.saving.set(false);
        product.status = status;
        this.actionSuccess.set(this.translate.t('ops.ok.productStatus', { status: this.label(status) }));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.productStatus'))); }
    });
  }
  restockProduct(product: any, addQuantity: number) {
    this.saving.set(true); this.decisionError.set('');
    const newStock = (product.stockQuantity || 0) + addQuantity;
    this.api.updateProduct(product.id, { stockQuantity: newStock }).subscribe({
      next: () => {
        this.saving.set(false);
        product.stockQuantity = newStock;
        if (product.status === 'out_of_stock' && newStock > 0) product.status = 'active';
        this.actionSuccess.set(this.translate.t('ops.ok.restocked', { count: addQuantity, stock: newStock }));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.restock'))); }
    });
  }
  setReviewStatus(review: any, status: 'published' | 'hidden' | 'flagged') {
    this.saving.set(true); this.decisionError.set('');
    this.api.updateReview(review.id, status).subscribe({
      next: () => {
        this.saving.set(false);
        review.status = status;
        this.actionSuccess.set(this.translate.t('ops.ok.reviewStatus', { status: this.label(status) }));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.moderateReview'))); }
    });
  }
  removeReview(review: any) {
    this.saving.set(true); this.decisionError.set('');
    this.api.deleteReview(review.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.selected.set(null);
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.deleteReview'))); }
    });
  }
  triageReport(report: any, status: 'investigating' | 'resolved' | 'dismissed') {
    this.saving.set(true); this.decisionError.set('');
    const notes = this.resolutionNotes().trim();
    this.api.updateReport(report.id, { status, resolutionNotes: notes }).subscribe({
      next: () => {
        this.saving.set(false);
        if (!report.details) report.details = {};
        report.details.status = status;
        report.details.resolutionNotes = notes;
        report.details.resolvedAt = new Date().toISOString();
        this.actionSuccess.set(this.translate.t('ops.ok.reportStatus', { status: this.label(status) }));
        this.load();
      },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, this.translate.t('ops.err.triage'))); }
    });
  }
}
