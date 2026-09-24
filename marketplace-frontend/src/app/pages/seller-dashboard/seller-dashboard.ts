import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { KcIcon } from '../../components/shared/ui/kc-icon/kc-icon';
import { StoreCategoriesManagerComponent } from '../../features/seller/store-categories/store-categories-manager.component';
import { SellerService } from '../../core/api/seller.service';
import { AuthService } from '../../core/auth/auth.service';
import { CommerceApiService } from '../../core/api/commerce-api.service';
import { OrderStatus } from '../../core/api/api.models';
import { cartErrorMessage } from '../../core/cart/cart.service';

type DashboardView = 'dashboard' | 'products' | 'add' | 'orders' | 'profile' | 'store-categories' | 'sales' | 'reviews' | 'settings';
type OrderStatusClass = 'pending' | 'shipped' | 'delivered';

interface SellerOrder {
  id: string;
  buyer: string;
  initials: string;
  color: string;
  product: string;
  qty: number;
  total: string;
  address: string;
  date: string;
  status: string;
  statusClass: OrderStatusClass;
  phone: string;
  note: string;
  paymentMethod: string;
  paymentStatus: string;
  items: {
    name: string;
    image: string | null;
    qty: number;
    price: number;
    subtotal: number;
  }[];
}

interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  note?: string;
  warn?: boolean;
  gold?: boolean;
}

@Component({
  selector: 'app-seller-dashboard',
  imports: [KcIcon, FormsModule, CurrencyPipe, StoreCategoriesManagerComponent],
  styles: [`
    /* ==========================================================
       KhmerCraft seller console - design tokens.
       One palette, one spacing rhythm, one elevation ladder.
       Every rule reads from these; change a token, not a rule.
       ========================================================== */
    :host {
      --brand-900: #0e3a28;
      --brand-800: #124a33;
      --brand-700: #176242;
      --brand-600: #1f7d55;
      --brand-100: #d9eee2;
      --brand-50:  #eff8f3;

      --ink-900: #14201b;
      --ink-700: #3b4943;
      --ink-500: #697871;
      --ink-400: #93a09a;
      --line:      #e2e8e5;
      --line-soft: #eef2f0;

      --surface: #fff;
      --canvas:  #f5f8f6;
      --raised:  #fbfcfb;

      --ok:     #1f7d55;  --ok-bg:     #e6f4ec;
      --warn:   #a9700f;  --warn-bg:   #fdf4e3;
      --danger: #b5372a;  --danger-bg: #fcece9;
      --info:   #2a6099;  --info-bg:   #eaf1f9;

      --r-sm: 7px;
      --r-md: 10px;
      --r-lg: 14px;
      --r-pill: 999px;

      --sh-sm: 0 1px 2px rgba(20, 32, 27, .05);
      --sh-md: 0 1px 3px rgba(20, 32, 27, .06), 0 6px 16px -8px rgba(20, 32, 27, .10);
      --sh-lg: 0 18px 48px -16px rgba(20, 32, 27, .28);

      --sidebar-w: 244px;
      --topbar-h: 64px;

      background: var(--canvas);
      color: var(--ink-700);
      display: block;
      min-height: 100vh;
      font-variant-numeric: tabular-nums;
      -webkit-font-smoothing: antialiased;
    }

    .portal { display: grid; grid-template-columns: var(--sidebar-w) 1fr; min-height: 100vh; }

    /* ============================ sidebar ============================ */
    .sidebar {
      background: var(--brand-900);
      border-right: 0;
      color: #cfe3d8;
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-height: 100vh;
      overflow-y: auto;
      padding: 22px 0 18px;
      position: sticky;
      top: 0;
    }
    .logo {
      color: #fff; display: block; font-family: var(--font-heading, Georgia, serif);
      font-size: 20px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; padding: 0 22px;
    }
    .portal-label {
      color: #7fae95; display: block; font-size: 10.5px; font-weight: 700;
      letter-spacing: .13em; padding: 5px 22px 0; text-transform: uppercase;
    }
    .store-switch { margin: 20px 14px 6px; }
    .nav { display: flex; flex-direction: column; gap: 2px; margin-top: 18px; padding: 0 12px; }
    .nav button {
      align-items: center; background: none; border: 0; border-radius: var(--r-md);
      color: #b9d3c6; cursor: pointer; display: flex; font: inherit; font-size: 13.5px;
      font-weight: 550; gap: 11px; padding: 10px 12px; position: relative; text-align: left;
      transition: background .14s ease, color .14s ease; width: 100%;
    }
    .nav button kc-icon { flex: none; opacity: .9; }
    .nav button:hover { background: rgba(255, 255, 255, .07); color: #fff; }
    .nav button.active { background: #fff; box-shadow: var(--sh-sm); color: var(--brand-900); font-weight: 700; }
    .nav button.active kc-icon { opacity: 1; }
    .nav button.active::after { display: none; }
    .logout {
      align-items: center; background: none; border: 0; border-top: 1px solid rgba(255, 255, 255, .1);
      color: #e8a99f; cursor: pointer; display: flex; font: inherit; font-size: 13px; font-weight: 650;
      gap: 10px; margin: auto 12px 0; padding: 16px 12px 4px; width: calc(100% - 24px);
    }
    .logout:hover { color: #ffc9c0; }
    .portal-version { color: rgba(255, 255, 255, .3); font-size: 10.5px; padding: 12px 22px 0; }

    /* ============================ topbar ============================ */
    .content { display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      align-items: center; backdrop-filter: saturate(180%) blur(12px);
      background: rgba(255, 255, 255, .88); border-bottom: 1px solid var(--line);
      display: flex; gap: 18px; height: var(--topbar-h); padding: 0 26px;
      position: sticky; top: 0; z-index: 30;
    }
    .search {
      align-items: center; background: var(--canvas); border: 1px solid var(--line);
      border-radius: var(--r-md); display: flex; flex: 1; gap: 9px; height: 38px;
      max-width: 420px; padding: 0 12px;
      transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .search:focus-within { background: var(--surface); border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-50); }
    .search kc-icon { color: var(--ink-400); flex: none; }
    .search input { background: none; border: 0; color: var(--ink-900); font: inherit; font-size: 13px; outline: none; width: 100%; }
    .search input::placeholder { color: var(--ink-400); }
    .top-actions { align-items: center; display: flex; gap: 14px; margin-left: auto; }
    .view-store {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-md); color: var(--ink-700); cursor: pointer; display: inline-flex;
      font: inherit; font-size: 12.5px; font-weight: 650; gap: 7px; padding: 8px 13px;
      text-decoration: none; transition: border-color .15s ease, color .15s ease;
    }
    .view-store:hover { border-color: var(--brand-600); color: var(--brand-700); }
    .seller-mini { align-items: center; border-left: 1px solid var(--line); display: flex; gap: 10px; padding-left: 14px; }
    .seller-mini strong {
      color: var(--ink-900); display: block; font-size: 12.5px; font-weight: 700; line-height: 1.25;
      max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .seller-mini span { color: var(--ink-500); font-size: 11px; }
    .avatar {
      align-items: center; background: var(--brand-700); border-radius: 50%; color: #fff;
      display: flex; flex: none; font-size: 13px; font-weight: 700; height: 34px; justify-content: center; width: 34px;
    }

    /* ============================ page frame ============================ */
    .page { margin: 0 auto; max-width: 1320px; padding: 28px 26px 64px; width: 100%; }
    .page > h1 {
      color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 27px;
      font-weight: 700; letter-spacing: -.02em; line-height: 1.15;
    }
    .muted { color: var(--ink-500); font-size: 13.5px; margin-top: 5px; }
    .orders-head, .products-head, .payout-head {
      align-items: flex-start; display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 9px; }

    /* ============================ buttons ============================ */
    .btn {
      align-items: center; border: 1px solid transparent; border-radius: var(--r-md); cursor: pointer;
      display: inline-flex; font: inherit; font-size: 13px; font-weight: 650; gap: 7px;
      justify-content: center; padding: 9px 16px; text-decoration: none; white-space: nowrap;
      transition: background .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
    }
    .btn-primary { background: var(--brand-700); border-color: var(--brand-700); box-shadow: var(--sh-sm); color: #fff; }
    .btn-primary:hover { background: var(--brand-600); border-color: var(--brand-600); }
    .btn-ghost { background: var(--surface); border-color: var(--line); color: var(--ink-700); }
    .btn-ghost:hover { border-color: var(--ink-400); color: var(--ink-900); }
    .btn[disabled] { cursor: not-allowed; opacity: .55; }
    .icon-btn {
      align-items: center; background: none; border: 1px solid transparent; border-radius: var(--r-sm);
      color: var(--ink-500); cursor: pointer; display: inline-flex; height: 30px; justify-content: center;
      transition: background .14s ease, border-color .14s ease, color .14s ease; width: 30px;
    }
    .icon-btn:hover { background: var(--canvas); border-color: var(--line); color: var(--ink-900); }

    /* ============================ metric cards ============================ */
    .metrics { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); margin-top: 24px; }
    .metric {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); display: flex; flex-direction: column; gap: 3px;
      padding: 16px 17px 17px; position: relative;
      transition: border-color .18s ease, box-shadow .18s ease;
    }
    .metric:hover { border-color: #d3ded8; box-shadow: var(--sh-md); }
    .metric-icon {
      align-items: center; background: var(--brand-50); border-radius: 9px; color: var(--brand-700);
      display: flex; height: 32px; justify-content: center; margin-bottom: 9px; width: 32px;
    }
    .metric.warn .metric-icon, .metric.gold .metric-icon { background: var(--warn-bg); color: var(--warn); }
    .metric-label { color: var(--ink-500); font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .metric strong { color: var(--ink-900); font-size: 25px; font-weight: 700; letter-spacing: -.02em; line-height: 1.15; }
    .metric > span:last-child { color: var(--ink-500); font-size: 12px; }
    .metric.warn > span:last-child { color: var(--warn); font-weight: 650; }

    /* ============================ cards / panels ============================ */
    .table-card, .form-card, .low-stock-card, .inventory-card, .goal-widget, .goal-card,
    .seller-card, .completion-card, .how-card, .tip-card, .settings-card, .danger-card,
    .publish-card, .product-preview, .filters, .product-filters {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-lg); box-shadow: var(--sh-sm);
    }
    .table-card { margin-top: 20px; overflow: hidden; }
    .table-card > header, .inventory-card > h2, .low-stock-card > h2, .goal-widget > h3,
    .form-card > h2, .how-card > h2, .tip-card > h2, .settings-card > h2, .danger-card > h2 {
      color: var(--ink-900); font-family: var(--font-heading, Georgia, serif);
      font-size: 15.5px; font-weight: 700; letter-spacing: -.01em;
    }
    .table-card > header {
      align-items: center; border-bottom: 1px solid var(--line-soft);
      display: flex; justify-content: space-between; padding: 15px 18px;
    }
    .table-card > header a, .table-card > header button {
      background: none; border: 0; color: var(--brand-700); cursor: pointer;
      font: inherit; font-size: 12.5px; font-weight: 700; text-decoration: none;
    }
    .table-card > header a:hover { text-decoration: underline; }

    /* ============================ tables ============================ */
    table { border-collapse: collapse; font-size: 13px; width: 100%; }
    th {
      background: var(--raised); border-bottom: 1px solid var(--line); color: var(--ink-500);
      font-size: 10.5px; font-weight: 700; letter-spacing: .07em; padding: 11px 18px;
      text-align: left; text-transform: uppercase; white-space: nowrap;
    }
    td { border-bottom: 1px solid var(--line-soft); color: var(--ink-700); padding: 13px 18px; vertical-align: middle; }
    tbody tr { transition: background .13s ease; }
    tbody tr:hover { background: var(--brand-50); }
    tbody tr:last-child td { border-bottom: 0; }
    .order-id { color: var(--brand-700); font-weight: 700; }
    .buyer { align-items: center; display: flex; gap: 9px; }
    .initial {
      align-items: center; border-radius: 50%; color: #fff; display: flex; flex: none;
      font-size: 11px; font-weight: 700; height: 28px; justify-content: center; width: 28px;
    }
    .table-foot {
      align-items: center; border-top: 1px solid var(--line-soft); color: var(--ink-500);
      display: flex; flex-wrap: wrap; font-size: 12.5px; gap: 12px;
      justify-content: space-between; padding: 12px 18px;
    }
    .pagination { display: flex; gap: 5px; }
    .pagination span, .pagination button {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-sm); color: var(--ink-700); cursor: pointer; display: inline-flex;
      font: inherit; font-size: 12.5px; height: 30px; justify-content: center; min-width: 30px; padding: 0 8px;
    }
    .pagination .current { background: var(--brand-700); border-color: var(--brand-700); color: #fff; font-weight: 700; }

    /* ============================ status + pills ============================ */
    .status, .pill {
      align-items: center; border-radius: var(--r-pill); display: inline-flex; font-size: 10.5px;
      font-weight: 700; gap: 5px; letter-spacing: .05em; padding: 4px 10px;
      text-transform: uppercase; white-space: nowrap;
    }
    .status::before { background: currentColor; border-radius: 50%; content: ''; height: 5px; width: 5px; }
    .cancelled { background: var(--danger-bg); color: var(--danger); }
    .pending { background: var(--warn-bg); color: var(--warn); }
    .shipped { background: var(--info-bg); color: var(--info); }
    .delivered { background: var(--ok-bg); color: var(--ok); }
        .pill.blue { background: var(--info-bg); color: var(--info); }
    .pill.green { background: var(--ok-bg); color: var(--ok); }
    .pill.yellow { background: var(--warn-bg); color: var(--warn); }
    .pill.red { background: var(--danger-bg); color: var(--danger); }
    .critical {
      background: var(--danger-bg); border-radius: var(--r-pill); color: var(--danger);
      font-size: 10px; font-weight: 700; letter-spacing: .05em; padding: 3px 9px; text-transform: uppercase;
    }

    /* ============================ filters + controls ============================ */
    .filters, .product-filters {
      align-items: flex-end; display: flex; flex-wrap: wrap; gap: 14px; margin-top: 20px; padding: 15px 17px;
    }
    .field { display: flex; flex: 1 1 180px; flex-direction: column; gap: 6px; min-width: 0; }
    .field label { color: var(--ink-500); font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .field-control, .dash-input, .dash-textarea, select {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
      color: var(--ink-900); font: inherit; font-size: 13px; padding: 9px 12px; width: 100%;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .field-control:focus, .field-control:focus-within, .dash-input:focus, .dash-textarea:focus, select:focus {
      border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-50); outline: none;
    }
    .field-control { align-items: center; display: flex; gap: 8px; }
    .field-control kc-icon { color: var(--ink-400); flex: none; }
    .field-control input { background: none; border: 0; color: inherit; font: inherit; font-size: 13px; outline: none; width: 100%; }
    .dash-textarea { line-height: 1.55; min-height: 96px; resize: vertical; }
    .reset { background: none; border: 0; color: var(--brand-700); cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700; padding: 9px 2px; }
    .reset:hover { text-decoration: underline; }
    .dash-form { display: flex; flex-direction: column; gap: 16px; }
    .two-cols { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
    .form-actions { display: flex; flex-wrap: wrap; gap: 9px; }
    .required { color: var(--danger); }

    /* ============================ empty states ============================ */
    .empty-state, .placeholder {
      align-items: center; display: flex; flex-direction: column; gap: 6px;
      padding: 52px 24px 58px; text-align: center;
    }
    .empty-state kc-icon, .placeholder kc-icon {
      align-items: center; background: var(--canvas); border-radius: 50%; color: var(--ink-400);
      display: flex; height: 54px; justify-content: center; margin-bottom: 8px; width: 54px;
    }
    .empty-state h2, .empty-state h3, .placeholder h2 {
      color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 16px; font-weight: 700;
    }
    .empty-state p, .placeholder p { color: var(--ink-500); font-size: 13px; max-width: 380px; }
    .empty-state .btn { margin-top: 10px; }

    /* ============================ dashboard home ============================ */
    .dashboard-grid {
      align-items: start; display: grid; gap: 18px;
      grid-template-columns: minmax(0, 1fr) 320px; margin-top: 20px;
    }
    .dash-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    .dashboard-grid > aside { display: flex; flex-direction: column; gap: 18px; }
    .quick-actions { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .quick-action {
      align-items: center; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-lg); box-shadow: var(--sh-sm); color: var(--ink-900); cursor: pointer;
      display: flex; flex-direction: column; font: inherit; font-size: 12.5px; font-weight: 650;
      gap: 9px; padding: 18px 12px; text-align: center;
      transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
    }
    .quick-action:hover { border-color: var(--brand-600); box-shadow: var(--sh-md); transform: translateY(-2px); }
    .quick-action kc-icon {
      align-items: center; background: var(--brand-50); border-radius: 10px; color: var(--brand-700);
      display: flex; height: 38px; justify-content: center; width: 38px;
    }
    .low-stock-card, .inventory-card, .goal-widget, .goal-card { padding: 17px 18px 18px; }
    .low-stock-card > h2, .inventory-card > h2 {
      align-items: center; display: flex; gap: 10px; justify-content: space-between; margin-bottom: 4px;
    }
    .stock-item {
      align-items: center; border-top: 1px solid var(--line-soft); display: grid; gap: 12px;
      grid-template-columns: 46px minmax(0, 1fr); padding: 13px 0;
    }
    .stock-item:first-of-type { border-top: 0; }
    .stock-item img, .product-thumb, .product-line img, .product-preview img, .review-img {
      background: var(--canvas); border: 1px solid var(--line-soft); border-radius: var(--r-md);
      display: block; object-fit: cover;
    }
    .stock-item img { height: 46px; width: 46px; }
    .stock-item strong {
      color: var(--ink-900); display: block; font-size: 13px; font-weight: 650;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .stock-item span { color: var(--danger); font-size: 12px; font-weight: 650; }
    .small-green {
      background: var(--brand-700); border: 0; border-radius: var(--r-sm); color: #fff;
      cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 650; margin-top: 6px; padding: 5px 11px;
    }
    .small-green:hover { background: var(--brand-600); }
    .goal-widget strong, .goal-card strong {
      color: var(--ink-900); display: block; font-size: 27px; font-weight: 700;
      letter-spacing: -.02em; margin: 6px 0 10px;
    }
    .track { background: var(--line-soft); border-radius: var(--r-pill); height: 7px; overflow: hidden; width: 100%; }
    .fill { background: var(--brand-600); border-radius: var(--r-pill); display: block; height: 100%; transition: width .4s ease; }
    .fill.low { background: var(--warn); }
    .goal-widget em, .goal-card em, .info-note {
      color: var(--ink-500); display: block; font-size: 12px; font-style: normal; line-height: 1.55; margin-top: 10px;
    }

    /* ============================ products ============================ */
    .products-head { margin-bottom: 4px; }
    .product-thumb { height: 44px; width: 44px; }
    .product-name strong { color: var(--ink-900); display: block; font-size: 13.5px; font-weight: 650; line-height: 1.35; }
    .product-name span { color: var(--ink-400); font-size: 11.5px; }
    .row-actions { display: flex; gap: 2px; justify-content: flex-end; }
    .product-insights { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 18px; }
    .tip-card, .inventory-card { padding: 17px 18px 18px; }
    .tip-card p, .inventory-card p { color: var(--ink-500); font-size: 12.5px; line-height: 1.6; margin-top: 6px; }
    .sparkle { color: var(--warn); }

    /* ============================ add product ============================ */
    .add-layout { align-items: start; display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 312px; margin-top: 20px; }
    .add-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    .add-side { display: flex; flex-direction: column; gap: 18px; }
    .form-card { padding: 19px 20px 20px; }
    .form-card > h2 { margin-bottom: 15px; }
    .upload-row { display: flex; flex-wrap: wrap; gap: 12px; }
    .upload-box, .upload-drop, .add-tile {
      align-items: center; background: var(--raised); border: 1.5px dashed var(--line);
      border-radius: var(--r-md); color: var(--ink-500); cursor: pointer; display: flex;
      flex-direction: column; gap: 6px; justify-content: center; padding: 22px 16px; text-align: center;
      transition: background .16s ease, border-color .16s ease, color .16s ease;
    }
    .upload-box:hover, .upload-drop:hover, .add-tile:hover {
      background: var(--brand-50); border-color: var(--brand-600); color: var(--brand-700);
    }
    .upload-box strong, .upload-drop strong { color: var(--ink-900); font-size: 13px; font-weight: 650; }
    .upload-drop small { color: var(--ink-400); font-size: 11.5px; }
    .publish-card { padding: 17px 18px; }
    .publish-card strong { color: var(--ink-900); display: block; font-size: 14px; font-weight: 700; }
    .publish-card span { color: var(--ink-500); display: block; font-size: 12.5px; line-height: 1.55; margin-top: 4px; }
    .preview-label { color: var(--ink-500); font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .product-preview { overflow: hidden; }
    .product-preview img { border: 0; border-radius: 0; height: 168px; width: 100%; }
    .preview-body { padding: 14px 16px 16px; }
    .preview-body small { color: var(--brand-700); font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .preview-body h3 { color: var(--ink-900); font-size: 15px; font-weight: 700; margin-top: 4px; }
    .preview-body p { color: var(--ink-500); font-size: 12.5px; line-height: 1.55; margin-top: 5px; }
    .preview-price { align-items: baseline; display: flex; gap: 7px; margin-top: 10px; }
    .preview-price strong { color: var(--ink-900); font-size: 19px; font-weight: 700; }
    .pro-tip {
      background: var(--warn-bg); border: 1px solid #f0e0bd; border-radius: var(--r-lg);
      color: #7a5310; font-size: 12.5px; line-height: 1.6; padding: 14px 16px;
    }
    .sticky-save {
      align-items: center; backdrop-filter: blur(10px); background: rgba(255, 255, 255, .92);
      border-top: 1px solid var(--line); bottom: 0; display: flex; gap: 12px;
      justify-content: flex-end; margin: 22px -26px -64px; padding: 14px 26px; position: sticky; z-index: 20;
    }
    .autosave { color: var(--ink-500); font-size: 12px; margin-right: auto; }

    /* ============================ reviews ============================ */
    .reviews-layout { display: flex; flex-direction: column; gap: 18px; }
    .rating-row { display: grid; gap: 16px; grid-template-columns: 250px minmax(0, 1fr); margin-top: 20px; }
    .rating-card {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); padding: 19px 20px;
    }
    .average { text-align: center; }
    .average strong { color: var(--ink-900); display: block; font-size: 42px; font-weight: 700; letter-spacing: -.03em; line-height: 1; }
    .average span { color: var(--ink-500); display: block; font-size: 12.5px; margin-top: 7px; }
    .stars-large { color: #d9a441; display: flex; gap: 3px; justify-content: center; margin-top: 9px; }
    .dist h2 { color: var(--ink-900); font-size: 14.5px; font-weight: 700; margin-bottom: 12px; }
    .bar-row { align-items: center; display: grid; gap: 11px; grid-template-columns: 42px minmax(0, 1fr) 38px; margin-bottom: 8px; }
    .bar-row span { color: var(--ink-500); font-size: 12px; }
    .review-tabs { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; }
    .chip {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-pill);
      color: var(--ink-700); cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
      padding: 7px 14px; transition: background .15s ease, border-color .15s ease, color .15s ease;
    }
    .chip:hover { border-color: var(--brand-600); color: var(--brand-700); }
    .chip.active { background: var(--brand-700); border-color: var(--brand-700); color: #fff; }
    .review-list { display: flex; flex-direction: column; gap: 14px; }
    .review-card {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); padding: 17px 19px 18px;
    }
    .review-top { align-items: flex-start; display: flex; gap: 12px; justify-content: space-between; }
    .review-person { align-items: center; display: flex; gap: 11px; }
    .review-person .initial { font-size: 13px; height: 38px; width: 38px; }
    .review-person h3 { color: var(--ink-900); font-size: 13.5px; font-weight: 700; }
    .date { color: var(--ink-400); font-size: 11.5px; }
    .review-stars { color: #d9a441; display: flex; gap: 2px; }
    .review-text { color: var(--ink-700); font-size: 13.5px; line-height: 1.65; margin-top: 11px; }
    .review-img { height: 76px; margin-top: 11px; width: 76px; }
    .response {
      background: var(--brand-50); border-left: 3px solid var(--brand-600);
      border-radius: 0 var(--r-md) var(--r-md) 0; font-size: 12.5px; line-height: 1.6;
      margin-top: 12px; padding: 11px 14px;
    }
    .response strong { color: var(--brand-700); display: block; font-size: 12px; margin-bottom: 3px; }
    .review-actions { display: flex; gap: 8px; margin-top: 13px; }
    .review-actions button {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
      color: var(--ink-700); cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 650; padding: 7px 13px;
    }
    .review-actions button:hover { border-color: var(--brand-600); color: var(--brand-700); }

    /* ============================ store profile ============================ */
    .profile-grid { align-items: start; display: grid; gap: 18px; grid-template-columns: 312px minmax(0, 1fr); margin-top: 20px; }
    .seller-card { overflow: hidden; }
    .banner { background: linear-gradient(135deg, var(--brand-800), var(--brand-600)); height: 92px; }
    .seller-card-body { padding: 0 18px 19px; text-align: center; }
    .store-logo-preview {
      align-items: center; background: var(--surface); border: 3px solid var(--surface);
      border-radius: 50%; box-shadow: var(--sh-md); color: var(--brand-700); display: flex;
      font-family: var(--font-heading, Georgia, serif); font-size: 24px; font-weight: 700;
      height: 72px; justify-content: center; margin: -36px auto 12px; width: 72px;
    }
    .seller-card h2 { color: var(--ink-900); font-size: 17px; font-weight: 700; }
    .seller-card p { color: var(--ink-500); font-size: 12.5px; line-height: 1.6; margin-top: 7px; }
    .store-rating { align-items: center; color: #d9a441; display: flex; gap: 5px; justify-content: center; margin-top: 7px; }
    .store-rating strong { color: var(--ink-900); font-size: 13px; }
    .completion-card { padding: 17px 18px 18px; }
    .completion-head { align-items: center; display: flex; justify-content: space-between; margin-bottom: 10px; }
    .completion-head strong { color: var(--ink-900); font-size: 14px; font-weight: 700; }
    .progress-line { background: var(--line-soft); border-radius: var(--r-pill); height: 7px; overflow: hidden; }
    .progress-line span { background: var(--brand-600); display: block; height: 100%; }
    .check-list { display: flex; flex-direction: column; gap: 8px; margin-top: 13px; }
    .check-list span { align-items: center; color: var(--ink-700); display: flex; font-size: 12.5px; gap: 8px; }
    .profile-form { display: flex; flex-direction: column; gap: 18px; }

    /* ============================ sales / payout ============================ */
    .sales-grid { align-items: start; display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 312px; margin-top: 20px; }
    .sales-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    .sales-grid > aside { display: flex; flex-direction: column; gap: 18px; }
    .payout-head { margin-bottom: 14px; }
    .payout-actions { display: flex; flex-wrap: wrap; gap: 9px; }
    .money { color: var(--ink-900); font-size: 30px; font-weight: 700; letter-spacing: -.02em; }
    .commission { color: var(--ink-500); font-size: 12.5px; }
    .paid { color: var(--ok); font-weight: 650; }
    .how-card { padding: 17px 18px 18px; }
    .how-card p { color: var(--ink-500); font-size: 12.5px; line-height: 1.6; margin-top: 6px; }
    .calc-row {
      align-items: center; border-top: 1px solid var(--line-soft); display: flex;
      font-size: 13px; justify-content: space-between; padding: 10px 0;
    }
    .calc-row:first-of-type { border-top: 0; }
    .earning { color: var(--ok); font-weight: 700; }

    /* ============================ settings ============================ */
    .settings-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-top: 20px; }
    .settings-card { padding: 19px 20px 20px; }
    .settings-card label { color: var(--ink-700); display: block; font-size: 12.5px; font-weight: 650; margin-bottom: 6px; }
    .settings-form { display: flex; flex-direction: column; gap: 15px; }
    .toggle-row {
      align-items: center; border-top: 1px solid var(--line-soft); display: flex;
      gap: 14px; justify-content: space-between; padding: 13px 0;
    }
    .toggle-row:first-of-type { border-top: 0; }
    .toggle-row strong { color: var(--ink-900); display: block; font-size: 13px; font-weight: 650; }
    .toggle-row span { color: var(--ink-500); font-size: 12px; }
    .switch {
      background: #cdd6d1; border: 0; border-radius: var(--r-pill); cursor: pointer; flex: none;
      height: 23px; padding: 0; position: relative; transition: background .18s ease; width: 41px;
    }
    .switch::after {
      background: #fff; border-radius: 50%; box-shadow: var(--sh-sm); content: '';
      height: 17px; left: 3px; position: absolute; top: 3px; transition: transform .18s ease; width: 17px;
    }
    .danger-card { border-color: #f0d3ce; padding: 19px 20px 20px; }
    .danger-card > h2 { color: var(--danger); }
    .danger-card > p { color: var(--ink-500); font-size: 12.5px; line-height: 1.6; margin-top: 6px; }
    .danger-action {
      align-items: center; border-top: 1px solid var(--line-soft); display: flex;
      gap: 14px; justify-content: space-between; padding: 13px 0;
    }
    .danger-action strong { color: var(--ink-900); display: block; font-size: 13px; font-weight: 650; }
    .danger-action span { color: var(--ink-500); font-size: 12px; }
    .danger-link { background: none; border: 0; color: var(--danger); cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700; }
    .danger-btn {
      background: var(--danger); border: 0; border-radius: var(--r-md); color: #fff;
      cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 650; padding: 8px 14px;
    }
    .danger-btn:hover { background: #9c2e23; }

    /* ============================ modal ============================ */
    .backdrop {
      align-items: center; backdrop-filter: blur(3px); background: rgba(14, 32, 24, .48);
      display: flex; inset: 0; justify-content: center; padding: 24px; position: fixed; z-index: 100;
    }
    .modal {
      background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--sh-lg);
      display: flex; flex-direction: column; max-height: 88vh; max-width: 720px; overflow: hidden; width: 100%;
    }
    .modal-head { align-items: center; border-bottom: 1px solid var(--line); display: flex; gap: 12px; padding: 16px 20px; }
    .modal-head h2 { color: var(--ink-900); font-family: var(--font-heading, Georgia, serif); font-size: 17px; font-weight: 700; }
    .modal-head .status { margin-left: 4px; }
    .close {
      background: none; border: 0; border-radius: var(--r-sm); color: var(--ink-500);
      cursor: pointer; font-size: 17px; height: 30px; margin-left: auto; width: 30px;
    }
    .close:hover { background: var(--canvas); color: var(--ink-900); }
    .modal-body { overflow-y: auto; padding: 20px; }
    .detail-grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
    .detail-panel { background: var(--raised); border: 1px solid var(--line-soft); border-radius: var(--r-md); padding: 15px 16px; }
    .detail-title {
      color: var(--ink-500); font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
      margin-bottom: 10px; text-transform: uppercase;
    }
    .info-line { display: flex; font-size: 13px; gap: 12px; justify-content: space-between; padding: 5px 0; }
    .info-line span:first-child { color: var(--ink-500); }
    .info-line span:last-child { color: var(--ink-900); font-weight: 600; text-align: right; }
    .note { color: var(--ink-500); font-size: 12.5px; line-height: 1.6; }
    .product-detail { margin-top: 18px; }
    .product-line { align-items: center; display: flex; gap: 13px; padding: 11px 0; }
    .product-line img { height: 54px; width: 54px; }
    .product-line h3 { color: var(--ink-900); font-size: 13.5px; font-weight: 650; }
    .product-line p { color: var(--ink-500); font-size: 12.5px; margin-top: 2px; }
    .subtotal {
      align-items: center; border-top: 1px solid var(--line); display: flex;
      justify-content: space-between; margin-top: 12px; padding-top: 12px;
    }
    .subtotal strong { color: var(--ink-900); font-size: 17px; font-weight: 700; }
    .modal-actions {
      border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 9px;
      justify-content: flex-end; padding: 15px 20px;
    }

    /* ============================ responsive ============================ */
    @media (max-width: 1180px) {
      .dashboard-grid, .add-layout, .sales-grid, .profile-grid, .rating-row { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 960px) {
      :host { --sidebar-w: 68px; }
      .logo { font-size: 0; padding: 0 0 0 20px; }
      .logo::first-letter { font-size: 21px; }
      .portal-label, .store-switch, .portal-version { display: none; }
      .nav button { justify-content: center; padding: 11px 0; }
      .nav button span, .logout span { display: none; }
      .logout { justify-content: center; }
      .seller-mini { display: none; }
    }
    @media (max-width: 720px) {
      .page { padding: 20px 16px 56px; }
      .topbar { padding: 0 16px; }
      .two-cols, .detail-grid { grid-template-columns: 1fr; }
      .sticky-save { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
      .table-card { overflow-x: auto; }
      table { min-width: 720px; }
    }

    /* a card header that sits inside a table-card needs the card's padding */
    .table-card > .payout-head {
      align-items: center; border-bottom: 1px solid var(--line-soft); margin-bottom: 0;
      padding: 15px 18px;
    }
    .table-card > .payout-head h2 {
      color: var(--ink-900); font-family: var(--font-heading, Georgia, serif);
      font-size: 15.5px; font-weight: 700; letter-spacing: -.01em;
    }

    /* the supporting line under a metric - sentence case, not another label */
    .metric-note { color: var(--ink-500); font-size: 12px; margin-top: 2px; }
    .metric.warn .metric-note { color: var(--warn); font-weight: 650; }

    /* a bare field-control used directly as a filter needs to share the row,
       not claim the full width the way it does inside a labelled .field */
    .filters > .field-control,
    .product-filters > .field-control { flex: 1 1 200px; width: auto; }
    .product-filters > .field-control:first-child { flex: 2 1 260px; }
    .filter-toggle { flex: none; padding: 0 13px; height: 38px; }

    /* card headings carry a leading icon - keep it on the baseline, not above */
    .form-card > h2, .how-card > h2, .tip-card > h2,
    .settings-card > h2, .danger-card > h2, .goal-widget > h2 {
      align-items: center; display: flex; gap: 9px;
    }
    .form-card > h2 kc-icon, .how-card > h2 kc-icon, .tip-card > h2 kc-icon,
    .settings-card > h2 kc-icon { color: var(--ink-400); flex: none; }
    .tip-card > h2 .sparkle { color: var(--warn); }

    /* name / count / action stack instead of colliding on one line */
    .stock-item > div {
      align-items: flex-start; display: flex; flex-direction: column; gap: 3px; min-width: 0; width: 100%;
    }
    .stock-item span { display: block; }
    .small-green { align-self: flex-start; }

    /* four fixed actions - keep them in a balanced block, never 3 + 1 */
    .quick-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (min-width: 1500px) { .quick-actions { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

    /* the theme buttons mark themselves with .selected and expose --swatch */
    .theme-choice { align-items: center; flex-direction: row; gap: 9px; }
    .theme-choice.selected { border-color: var(--brand-700); box-shadow: 0 0 0 3px var(--brand-50); }
    .theme-choice i {
      background: var(--swatch, var(--brand-700)); border: 1px solid rgba(0, 0, 0, .08);
      border-radius: 50%; flex: none; height: 18px; width: 18px;
    }
    .theme-options { grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); }

    /* an empty state that is itself the card needs the card surface */
    .empty-state.card-empty {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-lg); box-shadow: var(--sh-sm);
    }

    /* card headings need air before the first field */
    .settings-card > h2, .danger-card > h2, .how-card > h2, .goal-widget > h2 { margin-bottom: 13px; }
    .danger-card > h2 + p { margin-top: -8px; margin-bottom: 4px; }

    /* ============ store switcher (lives on the dark sidebar) ============ */
    .store-control { display: flex; flex-direction: column; gap: 6px; margin: 20px 14px 4px; }
    .store-control label {
      color: #7fae95; font-size: 10px; font-weight: 700;
      letter-spacing: .12em; text-transform: uppercase;
    }
    .store-control select {
      background: rgba(255, 255, 255, .08); border: 1px solid rgba(255, 255, 255, .16);
      border-radius: var(--r-md); color: #fff; font-size: 12.5px; font-weight: 600; padding: 8px 10px;
    }
    .store-control select option { background: var(--brand-900); color: #fff; }
    .store-control select:focus { border-color: var(--brand-600); box-shadow: 0 0 0 3px rgba(31, 125, 85, .35); }
    .new-store {
      background: none; border: 0; color: #8dc3a6; cursor: pointer; font: inherit;
      font-size: 11.5px; font-weight: 700; padding: 2px 0; text-align: left;
    }
    .new-store:hover { color: #fff; }

    /* ============ misc shared ============ */
    .view-all {
      background: none; border: 0; color: var(--brand-700); cursor: pointer;
      font: inherit; font-size: 12.5px; font-weight: 700; text-decoration: none;
    }
    .view-all:hover { text-decoration: underline; }
    .sort { color: var(--ink-500); font-size: 12.5px; font-weight: 600; }

    /* .money is used both as a big payout figure and as a table cell - keep them apart */
    td.money { color: var(--ink-900); font-size: 13px; font-weight: 650; }

    /* ============ store profile sections ============ */
    .profile-section-title { margin-bottom: 12px; }
    .profile-section-title strong { color: var(--ink-900); display: block; font-size: 14px; font-weight: 700; }
    .profile-section-title span { color: var(--ink-500); display: block; font-size: 12.5px; line-height: 1.55; margin-top: 3px; }
    .profile-message {
      background: var(--ok-bg); border: 1px solid #c6e3d3; border-radius: var(--r-md);
      color: var(--ok); font-size: 12.5px; font-weight: 600; padding: 10px 13px;
    }
    .public-contact {
      align-items: flex-start; border: 1px solid var(--line); border-radius: var(--r-md);
      cursor: pointer; display: flex; gap: 11px; padding: 13px 14px;
      transition: border-color .15s ease, background .15s ease;
    }
    .public-contact:hover { background: var(--brand-50); border-color: var(--brand-600); }
    .public-contact input { accent-color: var(--brand-700); flex: none; margin-top: 2px; }
    .public-contact span { color: var(--ink-500); font-size: 12px; line-height: 1.55; }
    .public-contact strong { color: var(--ink-900); font-size: 13px; font-weight: 650; }

    /* ============ theme picker ============ */
    .theme-options { display: grid; gap: 11px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .theme-choice {
      background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--r-md);
      cursor: pointer; display: flex; flex-direction: column; gap: 7px; padding: 13px 14px;
      text-align: left; transition: border-color .16s ease, box-shadow .16s ease;
    }
    .theme-choice:hover { border-color: var(--brand-600); }
    .theme-choice.active { border-color: var(--brand-700); box-shadow: 0 0 0 3px var(--brand-50); }
    .theme-choice strong { color: var(--ink-900); font-size: 13px; font-weight: 650; }
    .theme-choice span { color: var(--ink-500); font-size: 11.5px; line-height: 1.5; }

    /* ============ featured product picker ============ */
    .featured-picker { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
    .featured-option {
      align-items: center; background: var(--surface); border: 1.5px solid var(--line);
      border-radius: var(--r-md); cursor: pointer; display: flex; gap: 10px; padding: 10px 12px;
      transition: border-color .16s ease, background .16s ease;
    }
    .featured-option:hover { background: var(--brand-50); border-color: var(--brand-600); }
    .featured-option.active { border-color: var(--brand-700); box-shadow: 0 0 0 3px var(--brand-50); }
    .featured-option input { accent-color: var(--brand-700); flex: none; }
    .featured-option img { border-radius: var(--r-sm); height: 34px; object-fit: cover; width: 34px; }
    .featured-option span {
      color: var(--ink-900); font-size: 12.5px; font-weight: 600; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }

    /* ============ payout ============ */
    .payout-card {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--sh-sm); padding: 19px 20px 20px;
    }

    /* image placeholders read as intentional, never as a broken file */
    img[src=''], img:not([src]) { visibility: hidden; }
  `],
  template: `
    <div class="portal">
      <aside class="sidebar">
        <h1 class="logo" style="display:flex;align-items:center;gap:8px;font-size:17px">
          <img src="/assets/rentify-logo.webp" alt="Rentify Marketplace" style="width:24px;height:24px;border-radius:6px;object-fit:contain" />
          Rentify Marketplace
        </h1>
        <p class="portal-label">Seller Portal</p>
        <div class="store-control">
          <label for="active-store">Working in</label>
          <select id="active-store" [ngModel]="myStoreId()" (ngModelChange)="switchStore($event)">
            @for (store of stores(); track store.id || store._id) {
              <option [value]="store.id || store._id">{{ store.storeName }}</option>
            }
          </select>
          <button class="new-store" type="button" (click)="createAnotherStore()">+ Create another store</button>
        </div>
        <nav class="nav">
          @for (item of navItems; track item.view) {
            <button
              type="button"
              [class.active]="view() === item.view"
              (click)="view.set(item.view)"
            >
              <kc-icon [name]="item.icon" [size]="18" />
              {{ item.label }}
            </button>
          }
        </nav>
        <button type="button" class="logout" (click)="logout()">
          <kc-icon name="logout" [size]="17" />
          Logout
        </button>
      </aside>

      <section class="content">
        <header class="topbar">
          <div class="search">
            <kc-icon name="search" [size]="18" />
            <input 
              [placeholder]="view() === 'reviews' ? 'Search reviews...' : (view() === 'products' ? 'Search products...' : 'Search orders, ID, or customers...')"
              [ngModel]="globalSearchQuery()" 
              (ngModelChange)="globalSearchQuery.set($event)" 
            />
          </div>
          <div class="top-actions">
            <a class="view-store" [href]="activeStorefrontUrl()">
              View Store
              <kc-icon name="external" [size]="15" />
            </a>
            <kc-icon name="bell" [size]="18" style="color:#146242" />
            <div class="seller-mini">
              <div>
                <strong>{{ storeProfile().storeName || 'Your Store' }}</strong>
                <span>Premium Seller</span>
              </div>
              <div class="avatar" style="background: #146242; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;">
                {{ (storeProfile().storeName || 'Y').substring(0, 1).toUpperCase() }}
              </div>
            </div>
          </div>
        </header>

        @if (view() === 'dashboard') {
          <main class="page">
            <h1>Seller Dashboard</h1>
            <p class="muted">Manage your store, products, orders, and sales.</p>

            <section class="metrics">
              @for (metric of dashboardMetrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <div class="metric-icon"><kc-icon [name]="metric.icon" [size]="20" /></div>
                  <span class="metric-label">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  @if (metric.note) { <span class="metric-note">{{ metric.note }}</span> }
                </article>
              }
            </section>

            <section class="dashboard-grid">
              <div class="dash-main">
                <article class="table-card">
                  <div class="payout-head">
                    <h2>Recent Orders</h2>
                    <button class="view-all" type="button" (click)="view.set('orders')">View All</button>
                  </div>
                  @if (dashboardOrders().length) {
                  <table>
                    <thead>
                      <tr><th>Order ID</th><th>Buyer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      @for (order of dashboardOrders(); track order.id) {
                        <tr>
                          <td class="order-id">{{ order.id }}</td>
                          <td>{{ order.buyer }}</td>
                          <td>{{ order.product }}</td>
                          <td>{{ order.qty }}</td>
                          <td><strong>{{ order.total }}</strong></td>
                          <td><span class="status" [class.pending]="order.status === 'PENDING'" [class.shipped]="order.status === 'SHIPPED'" [class.delivered]="order.status === 'DELIVERED'">{{ order.status }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  } @else {
                    <div class="empty-state">
                      <kc-icon name="package" [size]="22" />
                      <h3>No orders yet</h3>
                      <p>When a buyer checks out, the order lands here for you to accept.</p>
                    </div>
                  }
                </article>

                <div class="quick-actions">
                  <button class="quick-action" type="button" (click)="view.set('add')"><kc-icon name="plus-square" [size]="24" /> Add New<br />Product</button>
                  <button class="quick-action" type="button" (click)="view.set('orders')"><kc-icon name="box" [size]="24" /> View Orders</button>
                  <button class="quick-action" type="button" (click)="view.set('profile')"><kc-icon name="edit" [size]="24" /> Edit Store<br />Profile</button>
                  <button class="quick-action" type="button" (click)="view.set('sales')"><kc-icon name="wallet" [size]="24" /> Sales / Payout</button>
                </div>
              </div>

              <aside>
                <article class="low-stock-card">
                  <h2>Low Stock Alert @if (lowStock().length > 0) { <span class="critical">{{ lowStock().length }} Critical</span> }</h2>
                  @for (item of lowStock(); track item.id) {
                    <div class="stock-item">
                      <img [src]="img(item.image)" [alt]="item.name" (error)="imgFallback($event)" />
                      <div>
                        <strong>{{ item.name }}</strong>
                        <span>{{ item.stock }} left in stock</span>
                        <button class="small-green" type="button" (click)="editProduct(item)">Update Stock</button>
                      </div>
                    </div>
                  }
                  @if (lowStock().length === 0) {
                    <p class="muted" style="font-size: 13px; margin: 10px 0;">All products have healthy stock levels.</p>
                  }
                  <button class="btn btn-ghost" type="button" style="width:100%;margin-top:10px">View All Inventory</button>
                </article>

                <article class="goal-widget">
                  <h2>Order Fulfillment Goal</h2>
                  <strong>{{ orders().length > 0 ? '100%' : '0%' }}</strong>
                  <div class="progress-line"><span [style.width]="orders().length > 0 ? '100%' : '0%'" style="background:#f2c13d"></span></div>
                  @if (orders().length > 0) {
                    <em>You are on track. Keep the momentum going.</em>
                  } @else {
                    <em>No orders yet. Share your store link to get the first one.</em>
                  }
                </article>
              </aside>
            </section>
          </main>
        } @else if (view() === 'products') {
          <main class="page">
            <div class="products-head">
              <div>
                <h1>Products</h1>
                <p class="muted">Add, edit, deactivate, or remove your product listings.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="view.set('add')"><kc-icon name="plus" [size]="15" /> Add Product</button>
            </div>

            <section class="product-filters">
              <div class="field-control"><kc-icon name="search" [size]="15" /> <input placeholder="Search by name or SKU" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" /></div>
              <div class="field-control">All Categories</div>
              <div class="field-control">Status: All</div>
              <button class="btn btn-ghost filter-toggle" type="button" aria-label="More filters"><kc-icon name="filter" [size]="16" /></button>
            </section>

            <section class="table-card">
              <table>
                <thead>
                  <tr><th>Image</th><th>Product Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  @for (product of filteredProducts(); track product.id) {
                    <tr>
                      <td><img class="product-thumb" [src]="img(product.image)" [alt]="product.name" (error)="imgFallback($event)" /></td>
                      <td class="product-name"><strong>{{ product.name }}</strong>@if (product.sku) { <span>SKU {{ product.sku }}</span> }</td>
                      <td><span class="pill blue">{{ product.category }}</span></td>
                      <td class="money">{{ product.price | currency: 'USD' }}</td>
                      <td [style.color]="product.stock === 0 ? '#c73030' : '#26302c'">{{ product.stock }}</td>
                      <td><span class="pill" [class.green]="product.status === 'ACTIVE'" [class.yellow]="product.status === 'LOW STOCK'" [class.red]="product.status === 'OUT OF STOCK'">{{ product.status }}</span></td>
                      <td>
                        <div class="row-actions">
                          <button class="icon-btn" type="button" (click)="editProduct(product)"><kc-icon name="edit" [size]="15" /></button>
                          <button class="icon-btn" type="button" (click)="toggleProductStatus(product)"><kc-icon [name]="product.status === 'ACTIVE' ? 'eye-off' : 'eye'" [size]="15" /></button>
                          <button class="icon-btn" type="button" (click)="deleteProduct(product.id)"><kc-icon name="trash" [size]="15" /></button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="table-foot">
                <span>Showing 1 to {{ products().length }} of {{ products().length }} products</span>
              </div>
            </section>

            <section class="product-insights">
              <article class="tip-card">
                <div class="sparkle"><kc-icon name="sparkles" [size]="24" /></div>
                <div>
                  <h2>Product Optimization Tip</h2>
                  @if (lowStock().length > 0) {
                    <p>Your "{{ lowStock()[0].name }}" listing has high traffic but low stock. Restocking soon could prevent you from missing out on potential sales.</p>
                  } @else {
                    <p>Your inventory is looking healthy. Consider adding new products to expand your catalog and reach more buyers.</p>
                  }
                </div>
              </article>
              <article class="inventory-card">
                <h2>Inventory Health <span style="float:right">{{ products().length }}</span></h2>
                <div class="progress-line"><span [style.width]="products().length > 0 ? '100%' : '0%'"></span></div>
                <p>{{ products().length > 0 ? '100%' : '0%' }} of your inventory is currently active and visible to customers.</p>
              </article>
            </section>
          </main>
        } @else if (view() === 'add') {
          <main class="page">
            <h1>Add New Product</h1>
            <p class="muted" style="max-width:690px">Create a new product listing for buyers to discover. Provide detailed information to increase your visibility in the Rentify Marketplace.</p>

            <section class="add-layout">
              <div class="add-main">
                <article class="form-card">
                  <h2><kc-icon name="info" [size]="18" style="color:#146242" /> Basic Info</h2>
                  <form class="dash-form">
                    <label>Product Name <span class="required">*</span><input class="dash-input" placeholder="e.g., Handwoven Silk Krama" [ngModel]="newProduct().name" (ngModelChange)="newProduct.set({...newProduct(), name: $event})" name="name" /></label>
                    <div class="two-cols">
                      <label>Category <span class="required">*</span>
                        <select class="dash-input" [ngModel]="newProduct().category" (ngModelChange)="newProduct.set({...newProduct(), category: $event})" name="category">
                          <option value="">Select Category</option>
                          <option value="Handmade Crafts">Handmade Crafts</option>
                          <option value="Pottery">Pottery</option>
                          <option value="Textiles">Textiles</option>
                          <option value="Food & Drink">Food & Drink</option>
                        </select>
                      </label>
                      <label>Material<input class="dash-input" placeholder="e.g., 100% Raw Silk" [ngModel]="newProduct().material" (ngModelChange)="newProduct.set({...newProduct(), material: $event})" name="material" /></label>
                    </div>
                    <label>Description <span class="required">*</span><textarea class="dash-textarea" placeholder="Tell the story of your product..." [ngModel]="newProduct().description" (ngModelChange)="newProduct.set({...newProduct(), description: $event})" name="desc"></textarea></label>
                  </form>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="wallet" [size]="18" style="color:#146242" /> Pricing & Stock</h2>
                  <div class="two-cols" style="grid-template-columns:1fr 1fr 1fr">
                    <label>Price (USD) <span class="required">*</span><input class="dash-input" type="number" placeholder="$ 0.00" [ngModel]="newProduct().price" (ngModelChange)="newProduct.set({...newProduct(), price: $event})" name="price" /></label>
                    <label>Stock Quantity <span class="required">*</span><input class="dash-input" type="number" placeholder="1" [ngModel]="newProduct().stock" (ngModelChange)="newProduct.set({...newProduct(), stock: $event})" name="stock" /></label>
                    <label>Location
                      <select class="dash-input" [ngModel]="newProduct().location" (ngModelChange)="newProduct.set({...newProduct(), location: $event})" name="loc">
                        <option value="Phnom Penh">Phnom Penh</option>
                        <option value="Siem Reap">Siem Reap</option>
                        <option value="Battambang">Battambang</option>
                      </select>
                    </label>
                  </div>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="image" [size]="18" style="color:#146242" /> Product Images</h2>
                  <div class="upload-drop" (click)="fileInput.click()" style="cursor: pointer; position: relative;">
                    <input type="file" #fileInput hidden accept="image/*" (change)="onFileSelected($event)">
                    @if (newProduct().image) {
                      <img [src]="newProduct().image" style="max-height: 120px; object-fit: contain; margin-bottom: 12px; border-radius: 4px;" />
                    }
                    <kc-icon name="upload-cloud" [size]="32" />
                    <span>{{ newProduct().image ? 'Click to change image' : 'Click to upload or drag and drop' }}</span>
                    <small>PNG, JPG or WEBP (Max 5MB each)</small>
                  </div>
                  <button class="add-tile" type="button">+</button>
                </article>

                <article class="publish-card">
                  <div><strong>Publish Immediately</strong><span>Make this product visible to buyers right away.</span></div>
                  <span class="switch"></span>
                </article>
              </div>

              <aside class="add-side">
                <span class="preview-label">Live Preview</span>
                <article class="product-preview">
                  <img [src]="newProduct().image || 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=520&q=85'" alt="Product preview" />
                  <div class="preview-body">
                    <small style="text-transform: uppercase;">{{ newProduct().category || 'Category' }}</small>
                    <h3>{{ newProduct().name || 'Product Name Preview' }}</h3>
                    <p>Store: {{ storeProfile().storeName || 'Your Store' }}</p>
                    <div class="preview-price"><strong>$<span>{{ newProduct().price || '0.00' }}</span> <span style="display:block;color:#6e7974;font-size:11px">Free Delivery</span></strong><span class="pill green">In Stock</span></div>
                  </div>
                </article>
                <article class="pro-tip">
                  <kc-icon name="lightbulb" [size]="22" />
                  <p style="margin:0;font-size:12px;font-weight:800;line-height:1.45">Pro Tip<br /><span style="font-weight:650">Artisans who upload 3+ photos and detailed descriptions see 45% more sales.</span></p>
                </article>
              </aside>
            </section>

            <div class="sticky-save">
              <span class="autosave"><kc-icon name="clock" [size]="14" /> Autosaved 2 minutes ago</span>
              <div class="actions">
                <button class="btn btn-ghost" type="button">Cancel</button>
                <button class="btn btn-ghost" type="button">Save as Draft</button>
                <button class="btn btn-primary" type="button" (click)="submitAddProduct()">Save Product</button>
              </div>
            </div>
          </main>
        } @else if (view() === 'orders') {
          <main class="page">
            <div class="orders-head">
              <div>
                <h1>Orders</h1>
                <p class="muted">View buyer orders and update delivery status.</p>
              </div>
              <div class="actions">
                <button class="btn btn-ghost" type="button"><kc-icon name="download" [size]="15" /> Export List</button>
                <button class="btn btn-primary" type="button"><kc-icon name="plus" [size]="15" /> Manual Order</button>
              </div>
            </div>

            <section class="metrics">
              @for (metric of metrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <div class="metric-icon"><kc-icon [name]="metric.icon" [size]="20" /></div>
                  <span class="metric-label">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </article>
              }
            </section>

            <section class="filters">
              <div class="field">
                <label>Search Keywords</label>
                <div class="field-control"><kc-icon name="search" [size]="15" /> <input class="dash-input" style="border:none;padding:0;height:auto;flex:1;background:transparent" placeholder="Order ID or Customer Name" [ngModel]="orderSearchQuery()" (ngModelChange)="orderSearchQuery.set($event)" /></div>
              </div>
              <div class="field">
                <label>Status Filter</label>
                <div class="field-control">All Statuses</div>
              </div>
              <div class="field">
                <label>Date Range</label>
                <div class="field-control">Last 7 Days</div>
              </div>
              <button class="reset" type="button">Reset Filters</button>
            </section>

            <section class="table-card">
              @if (filteredOrders().length) {
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Buyer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Address</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of filteredOrders(); track order.id) {
                    <tr>
                      <td><span class="order-id" (click)="openOrder(order)">{{ order.id }}</span></td>
                      <td>
                        <div class="buyer">
                          <span class="initial" [style.background]="order.color">{{ order.initials }}</span>
                          {{ order.buyer }}
                        </div>
                      </td>
                      <td>{{ order.product }}</td>
                      <td>{{ order.qty }}</td>
                      <td><strong>{{ order.total }}</strong></td>
                      <td>{{ order.address }}</td>
                      <td>{{ order.date }}</td>
                      <td>
                        <span
                          class="status"
                          [class.pending]="order.statusClass === 'pending'"
                          [class.shipped]="order.statusClass === 'shipped'"
                          [class.delivered]="order.statusClass === 'delivered'"
                        >
                          {{ order.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
                <div class="table-foot">
                  <span>Showing 1 to {{ filteredOrders().length }} of {{ filteredOrders().length }} orders</span>
                  <div class="pagination"><span>&lt;</span><span class="current">1</span><span>&gt;</span></div>
                </div>
              } @else {
                <div class="empty-state">
                  <kc-icon name="box" [size]="22" />
                  <h3>No orders found</h3>
                  <p>Nothing matches these filters yet. Clear them, or share your store link to bring in the first order.</p>
                </div>
              }
            </section>
          </main>
        } @else if (view() === 'reviews') {
          <main class="page reviews-layout">
            <h1 style="color:#146242">Reviews</h1>
            <p class="muted">See buyer ratings and comments for your products.</p>

            <section class="rating-row">
              <article class="rating-card average">
                <span>Average Rating</span>
                <strong>{{ (reviewsStats().averageRating || 0).toFixed(1) }}</strong> <span style="display:inline;color:#6b756f;letter-spacing:0;text-transform:none">/ 5.0</span>
                <div class="stars-large">*****</div>
                <p class="muted" style="font-size:11px;margin-top:7px">Based on {{ reviewsStats().totalReviews || 0 }} total reviews</p>
              </article>

              <article class="rating-card dist">
                <h2>Rating Distribution</h2>
                @for (bar of bars(); track bar.label) {
                  <div class="bar-row">
                    <span>{{ bar.label }}</span>
                    <div class="track"><div class="fill" [class.low]="bar.low" [style.width]="bar.width"></div></div>
                    <span>{{ bar.count }}</span>
                  </div>
                }
              </article>
            </section>

            <div class="review-tabs">
              <div class="chips">
                <button class="chip active" type="button">All ratings</button>
                <button class="chip" type="button">5 stars</button>
                <button class="chip" type="button">4 stars</button>
                <button class="chip" type="button">3 stars</button>
              </div>
              <span class="sort">Newest First</span>
            </div>

            <section class="review-list">
              @if (!filteredReviews().length) {
                <div class="empty-state card-empty">
                  <kc-icon name="review" [size]="22" />
                  <h3>No reviews yet</h3>
                  <p>Once buyers receive their orders they can rate them, and those ratings show up here.</p>
                </div>
              }
              @for (review of filteredReviews(); track review.id || review.name) {
                <article class="review-card">
                  <div class="review-top">
                    <div class="review-person">
                      <span class="initial" [style.background]="review.color">{{ review.initial }}</span>
                      <div>
                        <h3>{{ review.name }}</h3>
                        <p>Purchased: <span style="color:#146242">{{ review.product }}</span></p>
                      </div>
                    </div>
                    <span class="date">{{ review.date }}</span>
                  </div>
                  <div class="review-stars">*****</div>
                  <p class="review-text">{{ review.text }}</p>
                  @if (review.image) {
                    <img class="review-img" [src]="review.image" alt="Review product" />
                  }
                  @if (review.response) {
                    <div class="response"><strong>Your response:</strong>{{ review.response }}</div>
                  }
                  <div class="review-actions">
                    <a href="#">Reply to buyer</a>
                    <span>Flag as inappropriate</span>
                  </div>
                </article>
              }
            </section>
          </main>
        } @else if (view() === 'profile') {
          <main class="page">
            <h1>Store Profile</h1>
            <p class="muted">Update how your store appears to buyers.</p>

            <section class="profile-grid">
              <div>
                <article class="seller-card">
                  @if (storeProfile().bannerUrl) {
                    <img class="banner" [src]="storeProfile().bannerUrl" alt="Store banner" />
                  } @else {
                    <div class="banner" style="background: #e4ded3; height: 120px; display: flex; align-items: center; justify-content: center; color: #7a8580;">No banner uploaded</div>
                  }
                  <div class="seller-card-body">
                    @if (storeProfile().logoUrl) {
                      <img class="store-logo-preview" [src]="storeProfile().logoUrl" alt="Store logo" />
                    } @else {
                      <div class="store-logo-preview" style="background: #fff; border: 1px solid #e4ded3; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #146242;">
                        {{ (storeProfile().storeName || 'S').substring(0, 1).toUpperCase() }}
                      </div>
                    }
                    <h2>{{ storeProfile().storeName || 'Store Name' }}</h2>
                    <div class="store-rating"><span>{{ storeProfile().location || 'Location' }}</span></div>
                    <p><strong>{{ storeProfile().storeTagline || 'Add a short buyer-facing tagline.' }}</strong><br />{{ storeProfile().storeDescription || 'No description provided.' }}</p>
                    <a class="visit" [href]="activeStorefrontUrl()"><kc-icon name="eye" [size]="15" /> View Store</a>
                  </div>
                </article>

                <article class="completion-card">
                  <div class="completion-head"><span>Profile Completion</span><span style="color:#146242">{{ profileCompletion() }}%</span></div>
                  <div class="progress-line"><span [style.width.%]="profileCompletion()"></span></div>
                  <div class="check-list">
                    <span>
                      <kc-icon [name]="storeProfile().storeName && storeProfile().location ? 'check' : 'circle'" [size]="16" [style.color]="storeProfile().storeName && storeProfile().location ? '#146242' : '#ccc'" /> 
                      Basic Info
                    </span>
                    <span>
                      <kc-icon [name]="storeProfile().storeDescription ? 'check' : 'circle'" [size]="16" [style.color]="storeProfile().storeDescription ? '#146242' : '#ccc'" /> 
                      Store Description
                    </span>
                    <span>
                      <kc-icon [name]="storeProfile().phoneNumber ? 'check' : 'circle'" [size]="16" [style.color]="storeProfile().phoneNumber ? '#146242' : '#ccc'" /> 
                      Contact Number
                    </span>
                  </div>
                </article>
              </div>

              <article class="profile-form">
                <div class="upload-row">
                  <div>
                    <label style="font-size:11px;font-weight:900">Store Logo</label>
                    <div class="upload-box" style="height: 140px; cursor: pointer;" (click)="logoInput.click()">
                      <kc-icon name="file" [size]="20" style="color: #146242" />
                      <strong>Replace Logo</strong>
                      <span>SVG, PNG, JPG (Max. 5MB)</span>
                      <input #logoInput type="file" accept="image/*" style="display: none" (change)="onProfileImageSelected($event, 'logoUrl')" />
                    </div>
                  </div>
                  <div>
                    <label style="font-size:11px;font-weight:900">Store Banner</label>
                    <div class="upload-box" style="height: 140px; cursor: pointer;" (click)="bannerInput.click()">
                      <kc-icon name="image" [size]="20" style="color: #146242" />
                      <strong>Upload New Banner</strong>
                      <span>Recommended 1200x400px (Max. 5MB)</span>
                      <input #bannerInput type="file" accept="image/*" style="display: none" (change)="onProfileImageSelected($event, 'bannerUrl')" />
                    </div>
                  </div>
                </div>

                <form class="dash-form">
                  <label>Store Name<input class="dash-input" [ngModel]="storeProfile().storeName" (ngModelChange)="storeProfile.set({...storeProfile(), storeName: $event})" name="storeName" /></label>
                  <label>Store Tagline
                    <input class="dash-input" maxlength="160" [ngModel]="storeProfile().storeTagline" (ngModelChange)="storeProfile.set({...storeProfile(), storeTagline: $event})" name="storeTagline" placeholder="A clear one-line reason to shop here" />
                  </label>
                  <label>Description
                    <textarea class="dash-textarea" [ngModel]="storeProfile().storeDescription" (ngModelChange)="storeProfile.set({...storeProfile(), storeDescription: $event})" name="storeDesc"></textarea>
                  </label>
                  <label>Announcement
                    <input class="dash-input" maxlength="120" [ngModel]="storeProfile().announcement" (ngModelChange)="storeProfile.set({...storeProfile(), announcement: $event})" name="announcement" placeholder="Example: Free Phnom Penh delivery this weekend" />
                  </label>
                  <div class="profile-section-title"><strong>Storefront theme</strong><span>Choose one tested color system. Rentify Marketplace keeps typography and shopping controls consistent.</span></div>
                  <div class="theme-options">
                    @for (theme of storefrontThemes; track theme.value) {
                      <button type="button" class="theme-choice" [class.selected]="storeProfile().theme === theme.value" [style.--swatch]="theme.color" (click)="storeProfile.set({...storeProfile(), theme: theme.value})"><i></i>{{ theme.label }}</button>
                    }
                  </div>
                  <div class="two-cols">
                    <label>Location
                      <div style="position: relative; display: flex;">
                        <input class="dash-input" style="padding-right: 36px; width: 100%" [ngModel]="storeProfile().location" (ngModelChange)="storeProfile.set({...storeProfile(), location: $event})" name="location" placeholder="City, Country" />
                        <button type="button" (click)="detectLocation()" [disabled]="isDetectingLocation()" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #146242; padding: 0; display: flex; align-items: center;" title="Auto-detect Location">
                          <kc-icon [name]="isDetectingLocation() ? 'loader' : 'map-pin'" [size]="18" />
                        </button>
                      </div>
                    </label>
                    <label>Phone Number<input class="dash-input" [ngModel]="storeProfile().phoneNumber" (ngModelChange)="storeProfile.set({...storeProfile(), phoneNumber: $event})" name="phone" /></label>
                  </div>
                  <label class="public-contact"><input type="checkbox" [ngModel]="storeProfile().showContact" (ngModelChange)="storeProfile.set({...storeProfile(), showContact: $event})" name="showContact" /><span><strong>Show the store phone number publicly</strong><br />Buyers will see it in the About section. Leave this off if orders should stay inside Rentify Marketplace.</span></label>
                  <div class="profile-section-title"><strong>Featured products</strong><span>Select up to 6 products to place above the full store catalogue.</span></div>
                  @if (products().length) {
                    <div class="featured-picker">
                      @for (product of products(); track product.id) {
                        <label class="featured-option" [class.selected]="isFeaturedProduct(product.id)"><input type="checkbox" [checked]="isFeaturedProduct(product.id)" (change)="toggleFeaturedProduct(product.id)" /><span>{{ product.name }}</span></label>
                      }
                    </div>
                  } @else { <p class="muted">Add products first, then return here to feature your strongest listings.</p> }
                  <div class="form-actions">
                    @if (profileMessage()) { <span class="profile-message">{{ profileMessage() }}</span> }
                    <button class="btn btn-ghost" type="button" (click)="resetStoreProfile()">Cancel</button>
                    <button class="btn btn-primary" type="button" [disabled]="savingProfile()" (click)="saveStoreProfile()">{{ savingProfile() ? 'Saving…' : 'Publish storefront changes' }}</button>
                  </div>
                </form>
              </article>
            </section>
          </main>
        } @else if (view() === 'store-categories') {
          <main class="page">
            @if (myStoreId(); as storeId) {
              <app-store-categories-manager [storeId]="storeId" />
            } @else {
              <p class="muted">Select a store first.</p>
            }
          </main>
        } @else if (view() === 'sales') {
          <main class="page">
            <h1>Sales / Payout</h1>
            <p class="muted">Track your sales, commission, and seller earnings.</p>

            <section class="metrics" style="margin-top:28px">
              @for (metric of payoutMetrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <div class="metric-icon"><kc-icon [name]="metric.icon" [size]="20" /></div>
                  <span class="metric-label">{{ metric.note }}</span>
                  <span class="metric-label" style="text-transform:uppercase;margin-top:12px">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </article>
              }
            </section>

            <section class="sales-grid">
              <article class="payout-card sales-main">
                <div class="payout-head">
                  <h2>Payout History</h2>
                  <div class="payout-actions">
                    <button class="btn btn-ghost" type="button"><kc-icon name="filter" [size]="14" /> Filter</button>
                    <button class="btn btn-ghost" type="button"><kc-icon name="download" [size]="14" /> Export</button>
                  </div>
                </div>
                @if (payouts().length) {
                <table>
                  <thead>
                    <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Commission (10%)</th><th>Earning</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (row of payouts(); track row.id) {
                      <tr>
                        <td class="order-id">{{ row.id }}</td>
                        <td>{{ row.date }}</td>
                        <td>{{ row.total }}</td>
                        <td class="commission">{{ row.commission }}</td>
                        <td><strong>{{ row.earning }}</strong></td>
                        <td><span class="status" [class.paid]="row.status === 'PAID'" [class.pending]="row.status === 'PENDING'">{{ row.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
                  <div class="table-foot">
                    <span>Showing {{ payouts().length }} of {{ payouts().length }} transactions</span>
                    <div class="pagination"><span>&lt;</span><span class="current">1</span><span>&gt;</span></div>
                  </div>
                } @else {
                  <div class="empty-state">
                    <kc-icon name="wallet" [size]="22" />
                    <h3>No payouts yet</h3>
                    <p>Earnings appear here once an order is delivered and clears the 7-day return window.</p>
                  </div>
                }
              </article>

              <aside>
                <article class="how-card">
                  <h2>How it works</h2>
                  <p>Rentify Marketplace empowers artisans with a simple, flat-fee commission structure to keep our community sustainable.</p>
                  <div class="calc-row"><span>Sale Price</span><strong>$100.00</strong></div>
                  <div class="calc-row"><span>Commission <small style="background:#e6ad69;color:#17382a;border-radius:999px;padding:2px 5px">10%</small></span><strong>-$10.00</strong></div>
                  <div class="earning">Your Earning $90.00</div>
                  <div class="info-note"><kc-icon name="info" [size]="15" /> Payouts are processed every Friday for delivered orders that have passed the 7-day return window.</div>
                </article>
                <article class="goal-card">
                  <h3>Next Payout Goal <strong>$1,000 threshold</strong></h3>
                  <div class="progress-line" style="margin:13px 0 9px"><span [style.width]="'0%'"></span></div>
                  <p class="muted" style="font-size:11px">{{ payoutMetrics()[0]?.value || '$0.00' }} reached</p>
                  <button class="btn btn-primary" type="button" style="width:100%;margin-top:16px">Set Automatic Payout</button>
                </article>
              </aside>
            </section>
          </main>
        } @else if (view() === 'settings') {
          <main class="page">
            <h1>Settings</h1>
            <p class="muted">Manage your account and security.</p>

            <section class="settings-grid">
              <div>
                <article class="settings-card">
                  <h2><kc-icon name="user" [size]="18" style="color:#146242" /> Account Info</h2>
                  <form class="settings-form">
                    <div class="two-cols">
                      <label>Full Name<input class="dash-input" [value]="user()?.name" disabled style="background: #f5f7fb; cursor: not-allowed;" /></label>
                      <label>Email Address<input class="dash-input" [value]="user()?.email" disabled style="background: #f5f7fb; cursor: not-allowed;" /></label>
                    </div>
                    <label>Phone Number<input class="dash-input" [ngModel]="storeProfile().phoneNumber" (ngModelChange)="storeProfile.set({...storeProfile(), phoneNumber: $event})" name="settingsPhone" /></label>
                    <div class="form-actions"><button class="btn btn-primary" type="button" (click)="saveStoreProfile()">Save Changes</button></div>
                  </form>
                </article>

                <article class="settings-card" style="margin-top:24px">
                  <h2><kc-icon name="lock" [size]="18" style="color:#146242" /> Security</h2>
                  <form class="settings-form">
                    <label>Current Password<input class="dash-input" type="password" [ngModel]="currentPassword()" (ngModelChange)="currentPassword.set($event)" name="currentPassword" /></label>
                    <div class="two-cols">
                      <label>New Password<input class="dash-input" type="password" [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)" name="newPassword" /></label>
                      <label>Confirm New Password<input class="dash-input" type="password" [ngModel]="confirmNewPassword()" (ngModelChange)="confirmNewPassword.set($event)" name="confirmNewPassword" /></label>
                    </div>
                    <div><button class="btn btn-ghost" type="button" (click)="updatePassword()">Update Password</button></div>
                  </form>
                </article>
              </div>

              <div>
                <article class="settings-card">
                  <h2><kc-icon name="bell" [size]="18" style="color:#146242" /> Notifications</h2>
                  <div class="toggle-row">
                    <div><strong>Orders</strong><span>Notify when a new order is placed</span></div>
                    <span class="switch"></span>
                  </div>
                  <div class="toggle-row">
                    <div><strong>Low Stock</strong><span>Alert when items are under 5 units</span></div>
                    <span class="switch"></span>
                  </div>
                </article>

                <article class="danger-card" style="margin-top:24px">
                  <h2><kc-icon name="alert" [size]="18" /> Danger Zone</h2>
                  <p>Irreversible actions for your seller account. Please proceed with caution.</p>
                  <div class="danger-action">
                    <div><strong style="color:#26302c">Sign out of all devices</strong><span>Secure your account session</span></div>
                    <button class="danger-link" type="button">Logout</button>
                  </div>
                  <div class="danger-action">
                    <div><strong>Deactivate Account</strong><span>Stop selling and hide your store</span></div>
                    <button class="danger-btn" type="button">Deactivate</button>
                  </div>
                </article>
              </div>
            </section>

            <p class="portal-version">Rentify Marketplace Seller Portal v2.4.0 · Secured by TLS 1.3</p>
          </main>
        } @else {
          <main class="page">
            <h1>{{ currentTitle() }}</h1>
            <p class="muted">This seller dashboard section is ready for your next workflow.</p>
            <section class="placeholder">
              <h2>{{ currentTitle() }}</h2>
              <p class="muted">Use the sidebar to view the designed Orders and Reviews screens.</p>
            </section>
          </main>
        }
      </section>
    </div>

    @if (selectedOrder(); as order) {
      <div class="backdrop" (click)="closeOrder()">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>
              Order Detail - {{ order.id }}
              <span
                class="status"
                [class.pending]="order.statusClass === 'pending'"
                [class.shipped]="order.statusClass === 'shipped'"
                [class.delivered]="order.statusClass === 'delivered'"
              >{{ order.status }}</span>
            </h2>
            <button type="button" class="close" (click)="closeOrder()">×</button>
          </header>
          <div class="modal-body">
            <div class="detail-grid">
              <article>
                <div class="detail-title"><kc-icon name="user" [size]="14" /> Buyer Info</div>
                <div class="detail-panel">
                  <div class="info-line"><span>Name:</span><span>{{ order.buyer }}</span></div>
                  <div class="info-line"><span>Location:</span><span>{{ order.address }}</span></div>
                  <div class="info-line"><span>Phone:</span><span>{{ order.phone }}</span></div>
                  @if (order.note) {
                    <p class="note">"{{ order.note }}"</p>
                  }
                </div>
              </article>
              <article>
                <div class="detail-title"><kc-icon name="wallet" [size]="14" /> Payment Info</div>
                <div class="detail-panel">
                  <div class="info-line"><span>Method:</span><span>{{ order.paymentMethod }}</span></div>
                  <div class="info-line"><span>Status:</span><span style="color:#146242">{{ order.paymentStatus }}</span></div>
                  <div class="info-line"><span>Total Amount:</span><span style="color:#146242">{{ order.total }}</span></div>
                </div>
              </article>
            </div>

            <div class="detail-title"><kc-icon name="package" [size]="14" /> Product Details</div>
            <section class="product-detail">
              @for (item of order.items; track item.name) {
                <div class="product-line">
                  <img [src]="item.image || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=160&q=85'" [alt]="item.name" />
                  <div>
                    <h3>{{ item.name }}</h3>
                    <p>Qty: {{ item.qty }} * \${{ item.price.toFixed(2) }} ea</p>
                  </div>
                  <div class="subtotal">Subtotal<strong>\${{ item.subtotal.toFixed(2) }}</strong></div>
                </div>
              }
            </section>

            <div class="detail-title">Update Order Status</div>
            @if (statusUpdateError()) {
              <p class="note" style="color:#b3261e">{{ statusUpdateError() }}</p>
            }
            <div class="modal-actions">
              @if (nextStatusOptions(order.status).length) {
                <select
                  [ngModel]="statusChoice()"
                  (ngModelChange)="statusChoice.set($event)"
                  [disabled]="updatingStatus()"
                >
                  @for (opt of nextStatusOptions(order.status); track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
                <button class="btn btn-ghost" type="button" (click)="closeOrder()">Close</button>
                <button
                  class="btn btn-primary"
                  type="button"
                  [disabled]="updatingStatus() || !statusChoice()"
                  (click)="submitStatusUpdate()"
                >{{ updatingStatus() ? 'Updating…' : 'Update Status' }}</button>
              } @else {
                <span class="muted">This order is in a final state and cannot be updated.</span>
                <button class="btn btn-ghost" type="button" (click)="closeOrder()">Close</button>
              }
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class SellerDashboardPage implements OnInit {
  /**
   * Product images are optional in the catalogue, and an empty src renders as a
   * broken-file icon. Swap anything falsy for a neutral placeholder so a seller
   * with no photo yet sees a deliberate blank tile, not a bug.
   */
  private readonly imagePlaceholder =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>" +
    "<rect width='96' height='96' fill='%23f0f4f2'/>" +
    "<circle cx='36' cy='36' r='7' fill='%23c4d0ca'/>" +
    "<path d='M20 68l19-22 14 17 11-13 12 18z' fill='%23c4d0ca'/></svg>";

  protected img(src?: string | null): string {
    return src && src.trim() ? src : this.imagePlaceholder;
  }

  /** A URL that 404s still reaches us here; fall back the same way. */
  protected imgFallback(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el.src !== this.imagePlaceholder) {
      el.src = this.imagePlaceholder;
    }
  }

  private readonly sellerService = inject(SellerService);
  private readonly commerceApi = inject(CommerceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly user = this.authService.user;

  protected readonly view = signal<DashboardView>('dashboard');
  protected readonly selectedOrder = signal<SellerOrder | null>(null);
  protected readonly statusChoice = signal<OrderStatus | ''>('');
  protected readonly updatingStatus = signal(false);
  protected readonly statusUpdateError = signal('');
  protected readonly myStoreId = signal<string | null>(null);
  protected readonly stores = signal<any[]>([]);
  protected readonly activeStore = computed(() =>
    this.stores().find((store) => (store.id ?? store._id) === this.myStoreId()) ?? null,
  );

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');

  protected readonly isDetectingLocation = signal(false);

  updatePassword() {
    if (!this.currentPassword() || !this.newPassword() || !this.confirmNewPassword()) {
      alert('Please fill in all password fields.');
      return;
    }
    if (this.newPassword() !== this.confirmNewPassword()) {
      alert('New passwords do not match.');
      return;
    }

    this.authService.changePassword(
      this.currentPassword(),
      this.newPassword(),
      this.confirmNewPassword()
    ).subscribe({
      next: () => {
        alert('Password updated successfully');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmNewPassword.set('');
      },
      error: (err) => {
        alert('Failed to update password: ' + (err.error?.message || err.message));
      }
    });
  }

  async detectLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.isDetectingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const country = data.address?.country || '';
          const locationString = [city, country].filter(Boolean).join(', ');
          
          this.storeProfile.set({ ...this.storeProfile(), location: locationString || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        } catch (err) {
          alert('Failed to get location name. Using coordinates instead.');
          this.storeProfile.set({ ...this.storeProfile(), location: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        } finally {
          this.isDetectingLocation.set(false);
        }
      },
      (error) => {
        alert('Unable to retrieve your location. Please check your browser permissions.');
        this.isDetectingLocation.set(false);
      }
    );
  }

  protected readonly profileCompletion = computed(() => {
    const p = this.storeProfile();
    let score = 0;
    if (p.storeName?.trim()) score += 20;
    if (p.storeDescription?.trim() && p.storeTagline?.trim()) score += 20;
    if (p.location?.trim() && p.phoneNumber?.trim()) score += 20;
    if (p.logoUrl) score += 20;
    if (p.bannerUrl || p.featuredProductIds?.length) score += 20;
    return score;
  });
  
  private readonly http = inject(HttpClient);
  
  ngOnInit() {
    this.http.get<any[]>(`${API_URL}/sellers/my-stores`).subscribe({
      next: (stores) => {
        this.stores.set(stores ?? []);
        if (stores && stores.length > 0) {
          const requestedStoreId = this.route.snapshot.queryParamMap.get('storeId');
          const selectedStore = requestedStoreId
            ? stores.find((store) => (store.id ?? store._id) === requestedStoreId) ?? stores[0]
            : stores[0];
          // The current API intentionally exposes `id`, not MongoDB's `_id`.
          // Keep the fallback so older deployments remain compatible.
          const storeId = selectedStore.id ?? selectedStore._id;
          this.myStoreId.set(storeId);
          this.loadDashboardData(storeId);
        } else {
          alert('API returned empty stores list! Backend failed to create it.');
        }
      },
      error: (err) => {
        console.error('Failed to load stores', err);
        alert('API error when loading stores: ' + err.status + ' ' + (err.error?.message || err.message));
      }
    });
  }

  protected switchStore(storeId: string): void {
    if (!storeId || storeId === this.myStoreId()) return;
    this.myStoreId.set(storeId);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { storeId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadDashboardData(storeId);
  }

  protected createAnotherStore(): void {
    void this.router.navigate(['/seller/onboarding']);
  }

  protected activeStorefrontUrl(): string {
    const store = this.activeStore();
    return store ? `/stores/${store.slug ?? store.id ?? store._id}` : '/stores';
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }

  private loadDashboardData(storeId: string) {
    // 1. Orders and Metrics
    this.sellerService.getStoreOrders(storeId).subscribe({
      next: (data) => {
        this.metrics.set([
          { label: 'Pending Orders', value: data.metrics.pendingOrders.toString(), icon: 'clipboard' },
          { label: 'In Transit', value: data.metrics.inTransit.toString(), icon: 'truck', warn: true },
          { label: 'Completed (30d)', value: data.metrics.completed30d.toString(), icon: 'check' },
          { label: 'Revenue (MTD)', value: `$${data.metrics.revenueMtd.toFixed(2)}`, icon: 'wallet', gold: true },
        ]);

        this.dashboardMetrics.set([
          { label: 'Total Sales', value: `$${data.metrics.revenueMtd.toFixed(2)}`, note: 'Lifetime', icon: 'chart' },
          { label: 'Pending Orders', value: data.metrics.pendingOrders.toString(), note: 'Requires Action', icon: 'clipboard', warn: true },
        ]);

        this.payoutMetrics.set([
          { label: 'Total Sales', value: `$${data.metrics.revenueMtd.toFixed(2)}`, note: 'This month', icon: 'chart' },
          { label: 'Platform Commission', value: `$${(data.metrics.revenueMtd * 0.1).toFixed(2)}`, note: '10% standard rate', icon: 'percent', warn: true },
          { label: 'Seller Earnings', value: `$${(data.metrics.revenueMtd * 0.9).toFixed(2)}`, note: 'Ready for payout', icon: 'wallet' },
        ]);

        const mappedOrders = data.orders.map((o: any) => {
          let statusClass: OrderStatusClass = 'pending';
          if (o.orderStatus === 'SHIPPED') statusClass = 'shipped';
          if (o.orderStatus === 'DELIVERED') statusClass = 'delivered';
          return {
            id: o.orderNumber || o.id,
            buyer: o.buyerName,
            initials: o.buyerName ? o.buyerName.substring(0, 2).toUpperCase() : 'CU',
            color: '#dfe8ff',
            product: o.myItems.length > 0 ? o.myItems[0].productName : 'Multiple Items',
            qty: o.myItems.length > 0 ? o.myItems[0].quantity : 1,
            total: `$${o.myTotal.toFixed(2)}`,
            address: o.deliveryInfo?.address || 'No address',
            date: new Date(o.createdAt).toLocaleDateString(),
            status: o.orderStatus,
            statusClass,
            phone: o.buyerPhone || o.deliveryInfo?.phone || '',
            note: o.deliveryInfo?.note || '',
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            items: o.myItems.map((item: any) => ({
              name: item.productName,
              image: item.productImage ?? null,
              qty: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          };
        });
        this.orders.set(mappedOrders);
        this.dashboardOrders.set(mappedOrders.slice(0, 5));

        // Populate payouts logic (mock payout using completed orders)
        const payoutData = data.orders
          .filter((o: any) => o.paymentStatus === 'PAID')
          .map((o: any) => {
            const total = o.myTotal;
            const commission = total * 0.1;
            const earning = total - commission;
            return {
              id: o.orderNumber || o.id,
              date: new Date(o.createdAt).toLocaleDateString(),
              total: `$${total.toFixed(2)}`,
              commission: `$${commission.toFixed(2)}`,
              earning: `$${earning.toFixed(2)}`,
              status: 'PAID'
            };
          });
        this.payouts.set(payoutData);
      },
      error: (err) => console.error('Failed to load orders', err)
    });

    // 2. Products
    this.sellerService.getStoreProducts(storeId).subscribe({
      next: (data) => {
        this.products.set(data.products || []);
        this.lowStock.set((data.products || []).filter((p: any) => p.stock <= 5));
      },
      error: (err) => console.error('Failed to load products', err)
    });

    // 3. Profile
    this.sellerService.getStoreProfile(storeId).subscribe({
      next: (profile) => {
        this.storeProfile.set({
          storeName: profile.storeName ?? '',
          storeDescription: profile.storeDescription ?? '',
          storeTagline: profile.storeTagline ?? '',
          announcement: profile.announcement ?? '',
          theme: profile.theme ?? 'FOREST',
          showContact: profile.showContact ?? false,
          featuredProductIds: profile.featuredProductIds ?? [],
          location: profile.location ?? '',
          phoneNumber: profile.phoneNumber ?? '',
          logoUrl: profile.logoUrl ?? '',
          bannerUrl: profile.bannerUrl ?? ''
        });
        this.profileMessage.set('');
      },
      error: (err) => console.error('Failed to load profile', err)
    });

    // 4. Reviews
    this.sellerService.getStoreReviews(storeId).subscribe({
      next: (data) => {
        this.reviewsStats.set(data.stats || {});
        const mappedReviews = (data.reviews || []).map((r: any) => ({
          id: r.id ?? r._id,
          name: r.buyerName || r.reviewerName || 'Anonymous',
          initial: (r.buyerName || r.reviewerName || 'A').substring(0, 1).toUpperCase(),
          color: '#f0a36e',
          product: r.productName || 'Unknown Product',
          date: new Date(r.createdAt).toLocaleDateString(),
          text: r.comment,
          rating: r.rating,
          response: r.sellerResponse || null
        }));
        this.reviews.set(mappedReviews);
      },
      error: (err) => console.error('Failed to load reviews', err)
    });
  }

  protected readonly navItems: Array<{ view: DashboardView; label: string; icon: string }> = [
    { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { view: 'products', label: 'Products', icon: 'box' },
    { view: 'add', label: 'Add Product', icon: 'plus-square' },
    { view: 'orders', label: 'Orders', icon: 'cart' },
    { view: 'profile', label: 'Store Profile', icon: 'store' },
    { view: 'store-categories', label: 'Store Categories', icon: 'grid' },
    { view: 'sales', label: 'Sales / Payout', icon: 'wallet' },
    { view: 'reviews', label: 'Reviews', icon: 'review' },
    { view: 'settings', label: 'Settings', icon: 'settings' },
  ];

  protected readonly metrics = signal<DashboardMetric[]>([
    { label: 'Pending Orders', value: '-', icon: 'clipboard' },
    { label: 'In Transit', value: '-', icon: 'truck', warn: true },
    { label: 'Completed (30d)', value: '-', icon: 'check' },
    { label: 'Revenue (MTD)', value: '-', icon: 'wallet', gold: true },
  ]);

  protected readonly dashboardMetrics = signal<DashboardMetric[]>([]);
  protected readonly dashboardOrders = signal<any[]>([]);
  protected readonly lowStock = signal<any[]>([]);
  protected readonly products = signal<any[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly globalSearchQuery = signal('');
  
  protected readonly filteredProducts = computed(() => {
    const localQ = this.searchQuery().toLowerCase();
    const globalQ = this.globalSearchQuery().toLowerCase();
    const q = localQ || globalQ;
    if (!q) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));
  });
  protected readonly payoutMetrics = signal<DashboardMetric[]>([]);
  
  // Also create a signal for store profile
  protected readonly storeProfile = signal<any>({
    storeName: '',
    storeDescription: '',
    storeTagline: '',
    announcement: '',
    theme: 'FOREST',
    showContact: false,
    featuredProductIds: [],
    location: '',
    phoneNumber: '',
    logoUrl: '',
    bannerUrl: '',
  });

  protected readonly storefrontThemes = [
    { value: 'FOREST', label: 'Forest', color: '#275643' },
    { value: 'CLAY', label: 'Clay', color: '#a33a24' },
    { value: 'GOLD', label: 'Harvest', color: '#a97517' },
    { value: 'MIDNIGHT', label: 'Midnight', color: '#243547' },
  ] as const;
  protected readonly savingProfile = signal(false);
  protected readonly profileMessage = signal('');

  protected readonly newProduct = signal<any>({
    name: '', category: '', material: '', description: '', price: null, stock: null, location: 'Phnom Penh', status: 'ACTIVE', image: ''
  });

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newProduct.set({ ...this.newProduct(), image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  protected readonly reviews = signal<any[]>([]);
  protected readonly filteredReviews = computed(() => {
    const q = this.globalSearchQuery().toLowerCase();
    if (!q) return this.reviews();
    return this.reviews().filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.text.toLowerCase().includes(q) ||
      (r.product && r.product.toLowerCase().includes(q))
    );
  });
  protected readonly reviewsStats = signal<any>({});
  protected readonly payouts = signal<any[]>([]);

  editProduct(product: any) {
    this.newProduct.set({ ...product });
    this.view.set('add'); // Reusing the add view for editing
  }

  toggleProductStatus(product: any) {
    const newStatus = product.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    this.sellerService.updateProduct(product.id, { status: newStatus }).subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to update status: ' + err.message)
    });
  }

  deleteProduct(productId: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.sellerService.deleteProduct(productId).subscribe({
        next: () => {
          if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
        },
        error: (err) => alert('Failed to delete product: ' + err.message)
      });
    }
  }

  submitAddProduct() {
    const data = { ...this.newProduct() };
    
    // Parse numbers safely from input binding strings
    data.price = Number(data.price);
    data.stock = Number(data.stock);

    if (!data.name || !data.category || !data.price || isNaN(data.stock)) return;

    // Ownership and store identity always come from the signed-in account on
    // the API; never send editable/fallback seller names from the browser.
    delete data.material;
    delete data.sellerName;
    delete data.storeName;
    delete data.sellerId;
    if (!data.image) {
      delete data.image;
    }
    
    // If it has an id, it is an edit
    if (data.id) {
      const id = data.id;
      delete data.id;
      this.sellerService.updateProduct(id, data).subscribe({
        next: () => {
          alert('Product updated successfully!');
          if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
          this.view.set('products');
          this.newProduct.set({ name: '', category: '', material: '', description: '', price: null, stock: null, location: 'Phnom Penh', status: 'ACTIVE', image: '' });
        },
        error: (err) => {
          const errorMsg = err.error?.error?.details || err.error?.error?.message || err.message;
          alert('Failed to update product: ' + JSON.stringify(errorMsg));
        }
      });
      return;
    }

    data.storeId = this.myStoreId();
    this.sellerService.createProduct(data).subscribe({
      next: () => {
        alert('Product added successfully!');
        if (this.myStoreId()) {
          this.loadDashboardData(this.myStoreId()!);
        }
        this.view.set('products');
        this.newProduct.set({ name: '', category: '', material: '', description: '', price: null, stock: null, location: 'Phnom Penh', status: 'ACTIVE', image: '' });
      },
      error: (err) => {
        const errorMsg = err.error?.error?.details || err.error?.error?.message || err.message;
        alert('Failed to add product: ' + JSON.stringify(errorMsg));
      }
    });
  }

  saveStoreProfile() {
    const data = this.storeProfile();
    const id = this.myStoreId();
    if (!id) {
      this.profileMessage.set('Store ID is missing. Please refresh and try again.');
      return;
    }
    this.savingProfile.set(true);
    this.profileMessage.set('');
    this.sellerService.updateStoreProfile(id, data).pipe(
      finalize(() => this.savingProfile.set(false))
    ).subscribe({
      next: (updated) => {
        this.storeProfile.update((current) => ({ ...current, ...updated }));
        this.stores.update((stores) => stores.map((store) =>
          (store.id ?? store._id) === id ? { ...store, ...updated } : store
        ));
        this.profileMessage.set('Your storefront changes are now live.');
      },
      error: (err) => this.profileMessage.set(
        err.error?.error?.message || err.error?.message || err.message || 'Could not publish storefront changes.'
      )
    });
  }

  protected isFeaturedProduct(productId: string): boolean {
    return (this.storeProfile().featuredProductIds ?? []).includes(productId);
  }

  protected toggleFeaturedProduct(productId: string): void {
    const selected: string[] = this.storeProfile().featuredProductIds ?? [];
    if (selected.includes(productId)) {
      this.storeProfile.update((profile) => ({
        ...profile,
        featuredProductIds: selected.filter((id) => id !== productId),
      }));
      return;
    }
    if (selected.length >= 6) {
      this.profileMessage.set('Choose up to 6 featured products.');
      return;
    }
    this.profileMessage.set('');
    this.storeProfile.update((profile) => ({
      ...profile,
      featuredProductIds: [...selected, productId],
    }));
  }

  protected resetStoreProfile(): void {
    const id = this.myStoreId();
    if (id) this.loadDashboardData(id);
  }



  protected readonly orders = signal<SellerOrder[]>([]);
  protected readonly orderSearchQuery = signal('');
  protected readonly filteredOrders = computed(() => {
    const localQ = this.orderSearchQuery().toLowerCase();
    const globalQ = this.globalSearchQuery().toLowerCase();
    const q = localQ || globalQ;
    if (!q) return this.orders();
    return this.orders().filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.buyer.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q)
    );
  });

  protected readonly bars = signal<any[]>([]);





  protected currentTitle(): string {
    return this.navItems.find((item) => item.view === this.view())?.label ?? 'Dashboard';
  }

  /** Mirrors the server's order-lifecycle rules so the dropdown never offers an illegal move. */
  protected nextStatusOptions(status: string): OrderStatus[] {
    switch (status) {
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['SHIPPED', 'CANCELLED'];
      case 'SHIPPED':
        return ['DELIVERED'];
      default:
        return [];
    }
  }

  protected openOrder(order: SellerOrder): void {
    this.statusUpdateError.set('');
    const options = this.nextStatusOptions(order.status);
    this.statusChoice.set(options[0] ?? '');
    this.selectedOrder.set(order);
  }

  protected closeOrder(): void {
    this.selectedOrder.set(null);
    this.statusUpdateError.set('');
  }

  protected async submitStatusUpdate(): Promise<void> {
    const order = this.selectedOrder();
    const next = this.statusChoice();
    if (!order || !next) {
      return;
    }

    this.updatingStatus.set(true);
    this.statusUpdateError.set('');
    try {
      await firstValueFrom(this.commerceApi.setOrderStatus(order.id, next));

      const patch = (candidate: SellerOrder): SellerOrder =>
        candidate.id === order.id
          ? {
              ...candidate,
              status: next,
              statusClass:
                next === 'SHIPPED' ? 'shipped' : next === 'DELIVERED' ? 'delivered' : 'pending',
            }
          : candidate;
      this.orders.update((orders) => orders.map(patch));
      this.dashboardOrders.update((orders) => orders.map(patch));

      this.closeOrder();
    } catch (error: unknown) {
      this.statusUpdateError.set(cartErrorMessage(error));
    } finally {
      this.updatingStatus.set(false);
    }
  }

  onProfileImageSelected(event: any, field: 'logoUrl' | 'bannerUrl') {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large (max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Str = e.target?.result as string;
        this.storeProfile.set({ ...this.storeProfile(), [field]: base64Str });
      };
      reader.readAsDataURL(file);
    }
  }
}
