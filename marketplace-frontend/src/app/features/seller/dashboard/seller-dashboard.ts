import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { AuthService, apiErrorMessage } from '../../../core/auth/auth.service';
import { CommerceApiService } from '../../../core/api/commerce-api.service';
import { ApiProduct } from '../../../core/api/api.models';
import { CATEGORIES } from '../../../core/data/categories.data';

type DashboardView = 'dashboard' | 'products' | 'add' | 'orders' | 'profile' | 'sales' | 'reviews' | 'settings';
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
  imports: [KcIcon, FormsModule],
  styles: [`
    :host {
      background: #f8f4ec;
      color: #26302c;
      display: block;
      min-height: 100vh;
    }

    .portal {
      display: grid;
      grid-template-columns: 230px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      background: #f5f7fb;
      border-right: 1px solid #dce4e3;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 25px 0 30px;
    }

    .logo {
      color: #146242;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1;
      margin: 0 24px 3px;
    }

    .portal-label {
      color: #7b8782;
      font-size: 11px;
      font-weight: 700;
      margin: 0 24px 35px;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav button,
    .logout {
      align-items: center;
      background: transparent;
      border: 0;
      color: #53605b;
      cursor: pointer;
      display: flex;
      font-size: 14px;
      font-weight: 750;
      gap: 12px;
      min-height: 47px;
      padding: 0 22px;
      position: relative;
      text-align: left;
      width: 100%;
    }

    .nav button:hover {
      background: rgba(21, 95, 64, 0.06);
      color: #146242;
    }

    .nav button.active {
      background: #eaf2ff;
      color: #146242;
    }

    .nav button.active::after {
      background: #146242;
      border-radius: 999px;
      content: "";
      height: 47px;
      position: absolute;
      right: 0;
      top: 0;
      width: 4px;
    }

    .logout {
      color: #c33d35;
      margin-top: auto;
    }

      .content {
        min-width: 0;
      }
      .data-notice { align-items: center; background: #fff8e8; border-bottom: 1px solid #ead8af; color: #72511f; display: flex; font-size: 11.5px; gap: 8px; min-height: 38px; padding: 8px 24px; }

    .topbar {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid #ded8cd;
      display: flex;
      gap: 28px;
      height: 58px;
      justify-content: space-between;
      padding: 0 24px;
    }

    .search {
      align-items: center;
      background: #fff;
      border: 1px solid #cfd8cf;
      border-radius: 6px;
      color: #7a8580;
      display: flex;
      flex: 1;
      gap: 11px;
      height: 39px;
      max-width: 560px;
      padding: 0 13px;
    }

    .search input {
      border: 0;
      color: #303a36;
      flex: 1;
      font-size: 13px;
      font-weight: 650;
      outline: none;
    }

    .search input::placeholder {
      color: #9aa39f;
    }

    .top-actions {
      align-items: center;
      display: flex;
      gap: 22px;
    }

    .view-store {
      align-items: center;
      background: #fff;
      border: 1px solid #cfd8cf;
      border-radius: 5px;
      color: #4f5b56;
      display: flex;
      font-size: 13px;
      font-weight: 800;
      gap: 8px;
      height: 39px;
      padding: 0 17px;
      text-decoration: none;
    }

    .seller-mini {
      align-items: center;
      display: flex;
      gap: 12px;
    }

    .seller-mini img,
    .avatar {
      border-radius: 50%;
      height: 36px;
      object-fit: cover;
      width: 36px;
    }

    .seller-mini strong {
      display: block;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.1;
    }

    .seller-mini span {
      color: #7a8580;
      display: block;
      font-size: 10px;
      font-weight: 750;
    }

    .page {
      padding: 30px 28px 52px;
    }

    .page h1 {
      color: #1f2a33;
      font-size: 31px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1;
      margin: 0 0 8px;
    }

    .muted {
      color: #6e7974;
      font-size: 13px;
      font-weight: 650;
      margin: 0;
    }

    .orders-head {
      align-items: end;
      display: flex;
      gap: 20px;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      align-items: center;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      font-size: 13px;
      font-weight: 850;
      gap: 8px;
      height: 40px;
      justify-content: center;
      padding: 0 17px;
    }

    .btn-ghost {
      background: #fff;
      border: 1px solid #d7dbd4;
      color: #4f5b56;
    }

    .btn-primary {
      background: #146242;
      border: 1px solid #146242;
      color: #fff;
    }

    .metrics {
      display: grid;
      gap: 22px;
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 20px;
    }

    .metric {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      min-height: 119px;
      padding: 18px 18px 16px;
    }

    .metric-icon {
      align-items: center;
      background: #e9f6ef;
      border-radius: 7px;
      color: #146242;
      display: flex;
      height: 34px;
      justify-content: center;
      margin-bottom: 14px;
      width: 34px;
    }

    .metric.warn .metric-icon {
      background: #fbe7d2;
      color: #93612f;
    }

    .metric.gold .metric-icon {
      background: #fbefc9;
      color: #a66a00;
    }

    .metric-label {
      color: #59635f;
      display: block;
      font-size: 12px;
      font-weight: 800;
    }

    .metric strong {
      color: #1f2a33;
      display: block;
      font-size: 24px;
      font-weight: 900;
      line-height: 1;
      margin-top: 5px;
    }

    .filters,
    .table-card,
    .review-card,
    .rating-card {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
    }

    .filters {
      align-items: end;
      display: grid;
      gap: 18px;
      grid-template-columns: 1.4fr 0.7fr 0.7fr auto;
      margin-bottom: 18px;
      padding: 18px;
    }

    .field label {
      color: #59635f;
      display: block;
      font-size: 10px;
      font-weight: 850;
      margin-bottom: 8px;
    }

    .field-control {
      align-items: center;
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      color: #7a8580;
      display: flex;
      font-size: 12px;
      font-weight: 700;
      gap: 8px;
      height: 38px;
      padding: 0 12px;
    }

    .reset {
      background: transparent;
      border: 0;
      color: #146242;
      cursor: pointer;
      font-size: 12px;
      font-weight: 850;
      height: 38px;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th {
      background: #f6f1e8;
      color: #4f5b56;
      font-size: 12px;
      font-weight: 900;
      padding: 17px 18px;
      text-align: left;
    }

    td {
      border-top: 1px solid #eee8df;
      color: #404b46;
      font-size: 12px;
      font-weight: 700;
      padding: 16px 18px;
      vertical-align: middle;
    }

    .order-id {
      color: #146242;
      cursor: pointer;
      font-weight: 900;
    }

    .buyer {
      align-items: center;
      display: flex;
      gap: 10px;
    }

    .initial {
      align-items: center;
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 10px;
      font-weight: 900;
      height: 25px;
      justify-content: center;
      width: 25px;
    }

    .status {
      border-radius: 999px;
      display: inline-flex;
      font-size: 10px;
      font-weight: 900;
      justify-content: center;
      min-width: 88px;
      padding: 7px 12px;
      text-transform: uppercase;
    }

    .pending {
      background: #dca80d;
      color: #fff;
    }

    .shipped {
      background: #dce9fb;
      color: #657383;
    }

    .delivered {
      background: #dcefe4;
      color: #357457;
    }

    .table-foot {
      align-items: center;
      border-top: 1px solid #eee8df;
      color: #69746f;
      display: flex;
      font-size: 12px;
      font-weight: 700;
      justify-content: space-between;
      padding: 15px 18px;
    }

    .pagination {
      display: flex;
      gap: 8px;
    }

    .pagination span {
      align-items: center;
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      display: flex;
      height: 30px;
      justify-content: center;
      width: 30px;
    }

    .pagination .current {
      background: #146242;
      border-color: #146242;
      color: #fff;
    }

    .reviews-layout {
      max-width: 980px;
    }

    .rating-row {
      display: grid;
      gap: 24px;
      grid-template-columns: 310px 1fr;
      margin: 28px 0;
    }

    .rating-card {
      padding: 25px 28px;
    }

    .average {
      text-align: center;
    }

    .average span {
      color: #6d7672;
      display: block;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .average strong {
      color: #146242;
      display: inline-block;
      font-size: 44px;
      font-weight: 900;
      line-height: 1;
      margin: 8px 0 5px;
    }

    .stars-large {
      color: #d88636;
      font-size: 19px;
      letter-spacing: 2px;
    }

    .dist h2 {
      color: #303a36;
      font-size: 15px;
      font-weight: 900;
      margin: 0 0 20px;
    }

    .bar-row {
      align-items: center;
      display: grid;
      gap: 12px;
      grid-template-columns: 58px 1fr 28px;
      margin-bottom: 12px;
    }

    .bar-row span {
      color: #59635f;
      font-size: 12px;
      font-weight: 700;
    }

    .track {
      background: #eaf2ff;
      border-radius: 999px;
      height: 8px;
      overflow: hidden;
    }

    .fill {
      background: #146242;
      height: 100%;
    }

    .fill.low {
      background: #e6ad69;
    }

    .review-tabs {
      align-items: center;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 22px;
    }

    .chips {
      display: flex;
      gap: 10px;
    }

    .chip {
      background: #fff;
      border: 1px solid #cfd8cf;
      border-radius: 999px;
      color: #59635f;
      font-size: 13px;
      font-weight: 800;
      padding: 10px 17px;
    }

    .chip.active {
      background: #146242;
      border-color: #146242;
      color: #fff;
    }

    .sort {
      color: #59635f;
      font-size: 12px;
      font-weight: 800;
    }

    .review-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .review-card {
      padding: 24px;
    }

    .review-top {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 13px;
    }

    .review-person {
      align-items: center;
      display: flex;
      gap: 14px;
    }

    .review-person .initial {
      color: #95652e;
      height: 46px;
      width: 46px;
    }

    .review-person h3 {
      color: #303a36;
      font-size: 14px;
      font-weight: 900;
      margin: 0 0 3px;
    }

    .review-person p,
    .date {
      color: #78817d;
      font-size: 11px;
      font-weight: 700;
      margin: 0;
    }

    .review-stars {
      color: #d88636;
      font-size: 14px;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .review-text {
      color: #4c5752;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.6;
      margin: 0 0 18px;
    }

    .response {
      background: #f7f3ec;
      border-radius: 5px;
      color: #59635f;
      font-size: 12px;
      font-style: italic;
      font-weight: 650;
      line-height: 1.55;
      padding: 18px;
    }

    .response strong {
      color: #146242;
      display: block;
      font-style: normal;
      margin-bottom: 5px;
    }

    .review-img {
      border-radius: 4px;
      display: block;
      height: 75px;
      margin-bottom: 16px;
      object-fit: cover;
      width: 75px;
    }

    .review-actions {
      color: #53605b;
      display: flex;
      font-size: 11px;
      font-weight: 800;
      gap: 14px;
    }

    .review-actions a,
    .review-actions button {
      border: 0;
      padding: 0;
      background: transparent;
      color: #146242;
      font: inherit;
      text-decoration: none;
    }

    .profile-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: 300px 1fr;
      margin-top: 28px;
      max-width: 980px;
    }

    .seller-card,
    .completion-card,
    .profile-form,
    .settings-card,
    .danger-card,
    .payout-card,
    .how-card,
    .goal-card {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
    }

    .seller-card {
      overflow: hidden;
    }

    .banner {
      height: 142px;
      object-fit: cover;
      width: 100%;
    }

    .seller-card-body {
      padding: 0 22px 22px;
    }

    .store-logo-preview {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      height: 82px;
      margin-top: -42px;
      object-fit: cover;
      padding: 5px;
      position: relative;
      width: 82px;
    }

    .seller-card h2 {
      color: #26302c;
      font-size: 16px;
      font-weight: 900;
      margin: 14px 0 8px;
    }

    .store-rating {
      align-items: center;
      color: #59635f;
      display: flex;
      font-size: 12px;
      font-weight: 750;
      gap: 8px;
      margin-bottom: 18px;
    }

    .store-rating strong {
      color: #d88636;
    }

    .seller-card p {
      color: #59635f;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.55;
      margin: 0 0 20px;
    }

    .completion-card {
      margin-top: 22px;
      padding: 21px;
    }

    .completion-head {
      align-items: center;
      display: flex;
      font-size: 12px;
      font-weight: 900;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .progress-line {
      background: #dfe9f6;
      border-radius: 999px;
      height: 8px;
      margin-bottom: 18px;
      overflow: hidden;
    }

    .progress-line span {
      background: #146242;
      display: block;
      height: 100%;
      width: 85%;
    }

    .check-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .check-list span {
      align-items: center;
      color: #59635f;
      display: flex;
      font-size: 12px;
      font-weight: 750;
      gap: 8px;
    }

    .profile-form {
      padding: 30px;
    }

    .upload-row {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 26px;
    }

    .upload-box {
      align-items: center;
      background: #f7f9fc;
      border: 1px dashed #9fb3ad;
      border-radius: 8px;
      color: #66736e;
      display: flex;
      flex-direction: column;
      font-size: 10px;
      font-weight: 800;
      gap: 7px;
      height: 136px;
      justify-content: center;
      text-align: center;
    }

    .upload-box .upload-icon {
      align-items: center;
      background: #dbe8e4;
      border-radius: 7px;
      color: #146242;
      display: flex;
      height: 55px;
      justify-content: center;
      width: 55px;
    }

    .upload-box strong {
      color: #146242;
      display: block;
      font-size: 11px;
    }

    .dash-form {
      display: flex;
      flex-direction: column;
      gap: 19px;
    }

    .dash-form label,
    .settings-card label {
      color: #59635f;
      display: block;
      font-size: 11px;
      font-weight: 850;
    }

    .dash-input,
    .dash-textarea {
      background: #fff;
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      color: #2d3733;
      display: block;
      font-size: 13px;
      font-weight: 650;
      margin-top: 8px;
      outline: none;
      padding: 0 13px;
      width: 100%;
    }

    .dash-input {
      height: 43px;
    }

    .dash-textarea {
      min-height: 116px;
      padding-top: 13px;
      resize: vertical;
    }

    .two-cols {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 1fr;
    }

    .form-actions {
      display: flex;
      gap: 18px;
      justify-content: flex-end;
      margin-top: 14px;
    }

    .sales-grid {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 250px;
      margin-top: 28px;
    }

    .sales-main {
      min-width: 0;
    }

    .payout-head {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 22px 24px 12px;
    }

    .payout-head h2,
    .settings-card h2,
    .danger-card h2 {
      color: #26302c;
      font-size: 17px;
      font-weight: 900;
      margin: 0;
    }

    .payout-actions {
      display: flex;
      gap: 9px;
    }

    .money {
      color: #146242;
      font-weight: 900;
    }

    .commission {
      color: #b56c42;
    }

    .paid {
      background: #d9f5df;
      color: #2d8a52;
    }

    .how-card {
      background: #146242;
      color: #d7eadf;
      padding: 25px 22px;
    }

    .how-card h2 {
      color: #fff;
      font-size: 22px;
      font-weight: 900;
      margin: 0 0 16px;
    }

    .how-card p {
      font-size: 12px;
      font-weight: 650;
      line-height: 1.55;
      margin: 0 0 26px;
    }

    .calc-row {
      align-items: center;
      border-top: 1px solid rgba(255,255,255,0.14);
      display: flex;
      font-size: 13px;
      font-weight: 850;
      justify-content: space-between;
      padding: 14px 0;
    }

    .earning {
      background: rgba(255,255,255,0.14);
      border-radius: 5px;
      color: #b8ebcc;
      font-size: 24px;
      font-weight: 900;
      padding: 12px;
      text-align: right;
    }

    .info-note {
      align-items: flex-start;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
      display: flex;
      font-size: 11px;
      font-weight: 650;
      gap: 9px;
      line-height: 1.45;
      margin-top: 22px;
      padding: 13px;
    }

    .goal-card {
      margin-top: 20px;
      padding: 18px;
    }

    .goal-card h3 {
      font-size: 13px;
      font-weight: 900;
      margin: 0 0 4px;
    }

    .goal-card strong {
      color: #146242;
      float: right;
      font-size: 13px;
    }

    .settings-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: 1.2fr 0.8fr;
      margin-top: 28px;
    }

    .settings-card,
    .danger-card {
      padding: 25px;
    }

    .settings-card h2,
    .danger-card h2 {
      align-items: center;
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .toggle-row {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 23px;
    }

    .toggle-row strong {
      color: #26302c;
      display: block;
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .toggle-row span {
      color: #6e7974;
      font-size: 12px;
      font-weight: 650;
    }

    .switch {
      background: #146242;
      border-radius: 999px;
      height: 23px;
      position: relative;
      width: 45px;
    }

    .switch::after {
      background: #fff;
      border-radius: 50%;
      content: "";
      height: 17px;
      position: absolute;
      right: 3px;
      top: 3px;
      width: 17px;
    }

    .danger-card {
      background: #fff9f8;
      border-color: #f1d8d5;
    }

    .danger-card h2 {
      color: #c73030;
    }

    .danger-card > p {
      color: #7a5f5b;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.5;
      margin: -6px 0 22px;
    }

    .danger-action {
      align-items: center;
      background: #fff;
      border: 1px solid #f1d8d5;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding: 14px 16px;
    }

    .danger-action strong {
      color: #c73030;
      display: block;
      font-size: 13px;
      font-weight: 900;
    }

    .danger-action span {
      color: #7a5f5b;
      display: block;
      font-size: 11px;
      font-weight: 650;
      margin-top: 3px;
    }

    .danger-link {
      background: transparent;
      border: 0;
      color: #c73030;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
    }

    .danger-btn {
      background: #c73030;
      border: 0;
      border-radius: 5px;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      height: 36px;
      padding: 0 14px;
    }

    .portal-version {
      color: #b3ada3;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin-top: 45px;
      text-align: center;
      text-transform: uppercase;
    }

    .dashboard-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: 1fr 285px;
      margin-top: 28px;
    }

    .dash-main {
      min-width: 0;
    }

    .quick-actions {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(4, 1fr);
      margin-top: 22px;
    }

    .quick-action {
      align-items: center;
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      color: #26302c;
      display: flex;
      flex-direction: column;
      font-size: 11px;
      font-weight: 900;
      gap: 10px;
      justify-content: center;
      min-height: 105px;
      text-align: center;
    }

    .quick-action kc-icon {
      color: #1f2a33;
    }

    .low-stock-card,
    .goal-widget,
    .tip-card,
    .inventory-card,
    .product-preview,
    .pro-tip,
    .publish-card,
    .form-card {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
    }

    .low-stock-card {
      padding: 20px;
    }

    .low-stock-card h2,
    .goal-widget h2,
    .tip-card h2,
    .inventory-card h2 {
      color: #26302c;
      font-size: 15px;
      font-weight: 900;
      margin: 0 0 18px;
    }

    .critical {
      background: #ffd8d3;
      border-radius: 3px;
      color: #c73030;
      float: right;
      font-size: 9px;
      font-weight: 900;
      padding: 4px 8px;
      text-transform: uppercase;
    }

    .stock-item {
      align-items: center;
      display: grid;
      gap: 12px;
      grid-template-columns: 58px 1fr;
      margin-bottom: 18px;
    }

    .stock-item img {
      border-radius: 5px;
      height: 58px;
      object-fit: cover;
      width: 58px;
    }

    .stock-item strong {
      color: #26302c;
      display: block;
      font-size: 13px;
      font-weight: 900;
    }

    .stock-item span {
      color: #c73030;
      display: block;
      font-size: 12px;
      font-weight: 850;
      margin: 2px 0 8px;
    }

    .small-green {
      background: #146242;
      border: 0;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: 10px;
      font-weight: 900;
      height: 28px;
      padding: 0 13px;
    }

    .goal-widget {
      margin-top: 24px;
      padding: 20px;
    }

    .goal-widget strong {
      color: #146242;
      display: block;
      font-size: 23px;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .products-head {
      align-items: end;
      display: flex;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    .product-filters {
      align-items: center;
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr 160px 120px 42px;
      margin-bottom: 22px;
      padding: 15px;
    }

    .product-thumb {
      border-radius: 5px;
      height: 58px;
      object-fit: cover;
      width: 58px;
    }

    .product-name strong {
      color: #26302c;
      display: block;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.2;
    }

    .product-name span {
      color: #7a8580;
      display: block;
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
    }

    .pill {
      border-radius: 999px;
      display: inline-flex;
      font-size: 10px;
      font-weight: 900;
      padding: 6px 13px;
      text-transform: uppercase;
    }

    .pill.blue {
      background: #dfeaf8;
      color: #5b6c80;
    }

    .pill.green {
      background: #d9f5df;
      color: #2d8a52;
    }

    .pill.yellow {
      background: #fde8ab;
      color: #a66a00;
    }

    .pill.red {
      background: #ffd8d3;
      color: #c73030;
    }

    .row-actions {
      display: flex;
      gap: 14px;
    }

    .icon-btn {
      background: transparent;
      border: 0;
      color: #4f5b56;
      cursor: pointer;
      padding: 0;
    }

    .product-insights {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 250px;
      margin-top: 24px;
    }

    .tip-card {
      background: #fdebd9;
      border-color: #f4dac1;
      display: grid;
      gap: 18px;
      grid-template-columns: 62px 1fr;
      padding: 25px;
    }

    .sparkle {
      align-items: center;
      background: #f4b879;
      border-radius: 50%;
      color: #8b5424;
      display: flex;
      height: 52px;
      justify-content: center;
      width: 52px;
    }

    .tip-card h2 {
      color: #9a6743;
      font-size: 18px;
      margin-bottom: 8px;
    }

    .tip-card p,
    .inventory-card p {
      color: #7b6353;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.45;
      margin: 0;
    }

    .inventory-card {
      background: #eef4e8;
      padding: 22px;
    }

    .inventory-card h2 {
      color: #146242;
      font-size: 14px;
      text-transform: uppercase;
    }

    .add-layout {
      display: grid;
      gap: 24px;
      grid-template-columns: 1fr 300px;
      margin-top: 36px;
    }

    .add-main {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-card {
      padding: 26px 28px;
    }

    .form-card h2 {
      align-items: center;
      color: #26302c;
      display: flex;
      font-size: 18px;
      font-weight: 900;
      gap: 9px;
      margin: 0 0 24px;
    }

    .required {
      color: #c73030;
    }

    .upload-drop {
      align-items: center;
      border: 1px dashed #cfd8cf;
      border-radius: 8px;
      color: #7a8580;
      display: flex;
      flex-direction: column;
      font-size: 13px;
      font-weight: 750;
      gap: 8px;
      justify-content: center;
      min-height: 170px;
      text-align: center;
    }

    .upload-drop kc-icon {
      color: #b4c1bc;
    }

    .upload-drop small {
      color: #8d9691;
      font-size: 11px;
      font-weight: 700;
    }

    .add-tile {
      align-items: center;
      background: #dfeeff;
      border: 0;
      border-radius: 5px;
      color: #9aa4a0;
      display: flex;
      font-size: 20px;
      height: 72px;
      justify-content: center;
      margin-top: 22px;
      width: 72px;
    }

    .publish-card {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 24px 28px;
    }

    .publish-card strong {
      color: #26302c;
      display: block;
      font-size: 13px;
      font-weight: 900;
    }

    .publish-card span {
      color: #6e7974;
      display: block;
      font-size: 12px;
      font-weight: 650;
      margin-top: 4px;
    }

    .add-side {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .preview-label {
      color: #6e7974;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .product-preview {
      overflow: hidden;
    }

    .product-preview img {
      display: block;
      height: 370px;
      object-fit: cover;
      width: 100%;
    }

    .preview-body {
      padding: 18px;
    }

    .preview-body small {
      color: #146242;
      display: block;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .preview-body h3 {
      color: #26302c;
      font-size: 14px;
      font-weight: 900;
      margin: 0 0 5px;
    }

    .preview-body p {
      color: #6e7974;
      font-size: 12px;
      font-weight: 700;
      margin: 0 0 18px;
    }

    .preview-price {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .preview-price strong {
      color: #146242;
      display: block;
      font-size: 14px;
      font-weight: 900;
    }

    .pro-tip {
      background: #fff4d8;
      border-color: #efd69c;
      color: #7b5a21;
      display: grid;
      gap: 12px;
      grid-template-columns: 30px 1fr;
      padding: 17px;
    }

    .sticky-save {
      align-items: center;
      background: rgba(255,255,255,0.9);
      border-top: 1px solid #e4ded3;
      bottom: 0;
      display: flex;
      justify-content: space-between;
      left: 230px;
      padding: 18px 28px;
      position: sticky;
      z-index: 5;
    }

    .autosave {
      color: #8a948f;
      font-size: 12px;
      font-weight: 750;
    }

    .placeholder {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      margin-top: 28px;
      padding: 80px 30px;
      text-align: center;
    }

    .placeholder h2 {
      color: #146242;
      font-size: 24px;
      font-weight: 900;
      margin: 0 0 10px;
    }

    .backdrop {
      align-items: center;
      backdrop-filter: blur(5px);
      background: rgba(245, 242, 235, 0.76);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 24px;
      position: fixed;
      z-index: 20;
    }

    .modal {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      box-shadow: 0 20px 55px rgba(31, 42, 51, 0.16);
      max-width: 680px;
      padding: 0;
      width: 100%;
    }

    .modal-head {
      align-items: center;
      border-bottom: 1px solid #ece5dc;
      display: flex;
      justify-content: space-between;
      padding: 22px 24px;
    }

    .modal-head h2 {
      color: #1f2a33;
      font-size: 22px;
      font-weight: 900;
      margin: 0;
    }

    .modal-head .status {
      margin-left: 11px;
    }

    .close {
      background: transparent;
      border: 0;
      color: #4c5752;
      cursor: pointer;
      font-size: 28px;
      line-height: 1;
    }

    .modal-body {
      padding: 24px;
    }

    .detail-grid {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 0.86fr;
      margin-bottom: 24px;
    }

    .detail-panel {
      background: #f8f4ec;
      border-radius: 7px;
      padding: 19px;
    }

    .detail-title {
      align-items: center;
      color: #6b756f;
      display: flex;
      font-size: 12px;
      font-weight: 900;
      gap: 7px;
      letter-spacing: 0.06em;
      margin-bottom: 14px;
      text-transform: uppercase;
    }

    .info-line {
      display: grid;
      font-size: 12px;
      font-weight: 750;
      grid-template-columns: 85px 1fr;
      margin-bottom: 10px;
    }

    .info-line span:first-child {
      color: #6b756f;
    }

    .info-line span:last-child {
      color: #2c3732;
      text-align: right;
    }

    .note {
      color: #59635f;
      font-size: 12px;
      font-style: italic;
      font-weight: 800;
      line-height: 1.45;
      margin-top: 14px;
    }

    .product-detail {
      border: 1px solid #e4ded3;
      border-radius: 7px;
      margin-bottom: 24px;
      padding: 14px;
    }

    .product-line {
      align-items: center;
      display: grid;
      gap: 15px;
      grid-template-columns: 72px 1fr auto;
    }

    .product-line img {
      border-radius: 5px;
      height: 72px;
      object-fit: cover;
      width: 72px;
    }

    .product-line h3 {
      color: #26302c;
      font-size: 14px;
      font-weight: 900;
      margin: 0 0 4px;
    }

    .product-line p {
      color: #6b756f;
      font-size: 12px;
      font-weight: 700;
      margin: 0;
    }

    .subtotal {
      color: #26302c;
      font-size: 12px;
      font-weight: 900;
      text-align: right;
      text-transform: uppercase;
    }

    .subtotal strong {
      display: block;
      font-size: 15px;
      margin-top: 5px;
    }

    .modal-actions {
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr auto auto;
    }

    select {
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      color: #4c5752;
      font-size: 13px;
      font-weight: 750;
      height: 43px;
      padding: 0 12px;
    }

    @media (max-width: 980px) {
      .portal {
        grid-template-columns: 1fr;
      }

      .sidebar {
        min-height: auto;
      }

      .nav {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
      }

      .metrics,
      .filters,
      .rating-row,
      .detail-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 680px) {
      .topbar,
      .orders-head,
      .review-tabs {
        align-items: flex-start;
        flex-direction: column;
        height: auto;
        padding-bottom: 16px;
        padding-top: 16px;
      }

      .metrics,
      .filters,
      .rating-row,
      .detail-grid,
      .modal-actions {
        grid-template-columns: 1fr;
      }

      .table-card {
        overflow-x: auto;
      }

      table {
        min-width: 850px;
      }
    }
  `],
  template: `
    <div class="portal">
      <aside class="sidebar">
        <h1 class="logo">KhmerCraft</h1>
        <p class="portal-label">Seller Portal</p>
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
        <button type="button" class="logout">
          <kc-icon name="logout" [size]="17" />
          Logout
        </button>
      </aside>

      <section class="content">
        <header class="topbar">
          <div class="search">
            <kc-icon name="search" [size]="18" />
            <input [placeholder]="view() === 'reviews' ? 'Search reviews...' : 'Search orders, ID, or customers...'" />
          </div>
          <div class="top-actions">
            <span class="view-store" title="The public store link will appear after this seller account is connected to its store">
              Store preview pending
              <kc-icon name="external" [size]="15" />
            </span>
            <kc-icon name="bell" [size]="18" style="color:#146242" />
            <div class="seller-mini">
              <div>
                <strong>Seller workspace</strong>
                <span>Plan status not connected</span>
              </div>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=85" alt="Seller avatar" />
            </div>
          </div>
        </header>

        <div class="data-notice" role="status">
          <kc-icon name="info" [size]="15" />
          Preview workspace: product, review, sales and profile examples remain sample data until their backend endpoints are connected.
        </div>

        @if (view() === 'dashboard') {
          <main class="page">
            <h1>Seller Dashboard</h1>
            <p class="muted">Manage your store, products, orders, and sales.</p>

            <section class="metrics" style="margin-top:28px;grid-template-columns:repeat(5,1fr)">
              @for (metric of dashboardMetrics; track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <span class="metric-label" style="text-transform:uppercase">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <span class="metric-label" style="color:#146242;margin-top:10px">{{ metric.note }}</span>
                </article>
              }
            </section>

            <section class="dashboard-grid">
              <div class="dash-main">
                <article class="table-card">
                  <div class="payout-head">
                    <h2>Recent Orders</h2>
                    <button class="view-all" type="button" (click)="view.set('orders')" style="border:0;background:transparent;color:#146242;font-size:12px;font-weight:900">View All</button>
                  </div>
                  <table>
                    <thead>
                      <tr><th>Order ID</th><th>Buyer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      @for (order of dashboardOrders; track order.id) {
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
                  <h2>Low Stock Alert <span class="critical">3 Critical</span></h2>
                  @for (stock of lowStock; track stock.name) {
                    <div class="stock-item">
                      <img [src]="stock.image" [alt]="stock.name" />
                      <div>
                        <strong>{{ stock.name }}</strong>
                        <span>{{ stock.left }} left in stock</span>
                        <button class="small-green" type="button">Update Stock</button>
                      </div>
                    </div>
                  }
                  <button class="btn btn-ghost" type="button" style="width:100%;margin-top:10px">View All Inventory</button>
                </article>

                <article class="goal-widget">
                  <h2>Order Fulfillment Goal</h2>
                  <strong>85%</strong>
                  <div class="progress-line"><span style="width:85%;background:#f2c13d"></span></div>
                  <p class="muted" style="font-size:12px;font-style:italic">"You're doing great! Complete 3 more orders to reach your weekly goal."</p>
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

            @if (loadingProducts()) {
              <section class="table-card"><p class="muted" style="padding:24px">Loading your products…</p></section>
            } @else if (productsError()) {
              <section class="table-card">
                <p class="muted" style="padding:24px;color:#c73030">{{ productsError() }}</p>
                <button class="btn btn-ghost" type="button" (click)="loadMyProducts()" style="margin:0 24px 20px">Try again</button>
              </section>
            } @else if (!myProducts().length) {
              <section class="table-card">
                <p class="muted" style="padding:24px">You haven't listed any products yet. Click "Add Product" to publish your first one.</p>
              </section>
            } @else {
              <section class="table-card">
                <table>
                  <thead>
                    <tr><th>Image</th><th>Product Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    @for (product of myProducts(); track product.id) {
                      <tr>
                        <td>
                          @if (product.image) {
                            <img class="product-thumb" [src]="product.image" [alt]="product.name" />
                          } @else {
                            <div class="product-thumb img-placeholder" style="display:flex;align-items:center;justify-content:center;font-size:9px">No image</div>
                          }
                        </td>
                        <td class="product-name"><strong>{{ product.name }}</strong><span>{{ product.slug }}</span></td>
                        <td><span class="pill blue">{{ product.category }}</span></td>
                        <td class="money">\${{ product.price.toFixed(2) }}</td>
                        <td [style.color]="product.stock === 0 ? '#c73030' : '#26302c'">{{ product.stock }}</td>
                        <td><span class="pill" [class.green]="product.status === 'ACTIVE'" [class.yellow]="product.status === 'DRAFT'" [class.red]="product.status === 'ARCHIVED'">{{ product.status }}</span></td>
                        <td>
                          <div class="row-actions">
                            <button class="icon-btn" type="button" disabled title="Editing from here is coming soon"><kc-icon name="edit" [size]="15" /></button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                <div class="table-foot">
                  <span>Showing {{ myProducts().length }} of {{ myProductsTotal() }} product{{ myProductsTotal() === 1 ? '' : 's' }}</span>
                </div>
              </section>

              <section class="product-insights">
                <article class="inventory-card">
                  <h2>Inventory Health <span style="float:right">{{ activeProductCount() }} / {{ myProductsTotal() }}</span></h2>
                  <div class="progress-line"><span [style.width.%]="myProductsTotal() ? (activeProductCount() / myProductsTotal() * 100) : 0"></span></div>
                  <p>{{ activeProductPercent() }}% of your listings are active and visible to buyers right now.</p>
                </article>
              </section>
            }
          </main>
        } @else if (view() === 'add') {
          <main class="page">
            <h1>Add New Product</h1>
            <p class="muted" style="max-width:690px">Create a new product listing for buyers to discover. Provide detailed information to increase your visibility in the KhmerCraft marketplace.</p>

            @if (saveProductError()) {
              <p class="muted" style="color:#c73030;font-weight:700">{{ saveProductError() }}</p>
            }

            <section class="add-layout">
              <div class="add-main">
                <article class="form-card">
                  <h2><kc-icon name="info" [size]="18" style="color:#146242" /> Basic Info</h2>
                  <div class="dash-form">
                    <label>Product Name <span class="required">*</span><input class="dash-input" name="productName" [(ngModel)]="productForm.name" placeholder="e.g., Handwoven Silk Krama" /></label>
                    <div class="two-cols">
                      <label>Category <span class="required">*</span>
                        <select class="dash-input" [value]="selectedCategory()" (change)="setProductCategory($event)">
                          <option value="">Select Category</option>
                          @for (category of productCategories; track category.slug) {
                            <option [value]="category.slug">{{ category.name }}</option>
                          }
                        </select>
                      </label>
                      <label>Subcategory
                        <select class="dash-input" [value]="subcategoryValue()" (change)="setProductSubcategory($event)" [disabled]="!selectedCategory()">
                          <option value="">{{ selectedCategory() ? 'Select Subcategory' : 'Choose a category first' }}</option>
                          @for (subcategory of selectedSubcategories(); track subcategory.slug) {
                            <option [value]="subcategory.slug">{{ subcategory.name }}</option>
                          }
                        </select>
                      </label>
                    </div>
                    <label>Description<textarea class="dash-textarea" name="productDescription" [(ngModel)]="productForm.description" placeholder="Tell the story of your product, how it's made, and its unique features..."></textarea></label>
                  </div>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="wallet" [size]="18" style="color:#146242" /> Pricing & Stock</h2>
                  <div class="two-cols" style="grid-template-columns:1fr 1fr 1fr">
                    <label>Price (USD) <span class="required">*</span><input class="dash-input" type="number" min="0.01" step="0.01" name="productPrice" [(ngModel)]="productForm.price" placeholder="$ 0.00" /></label>
                    <label>Stock Quantity<input class="dash-input" type="number" min="0" step="1" name="productStock" [(ngModel)]="productForm.stock" placeholder="1" /></label>
                    <label>Location<input class="dash-input" name="productLocation" [(ngModel)]="productForm.location" placeholder="e.g. Phnom Penh" /></label>
                  </div>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="box" [size]="18" style="color:#146242" /> Product Options & Variants</h2>
                  <p class="muted" style="font-size:12px;margin-bottom:16px">Prepare the exact option a buyer will purchase. Variant saving will activate when the product-variant API is connected.</p>
                  <div class="two-cols">
                    <label>Option type
                      <select class="dash-input" disabled>
                        <option>Size</option><option>Color</option><option>Weight</option><option>Pack size</option><option>Storage</option><option>Material</option>
                      </select>
                    </label>
                    <label>Option values<input class="dash-input" disabled placeholder="e.g. Small, Medium, Large" /></label>
                  </div>
                  <div class="two-cols" style="grid-template-columns:1fr 1fr 1fr">
                    <label>Variant SKU<input class="dash-input" disabled placeholder="STORE-PRODUCT-S" /></label>
                    <label>Variant price<input class="dash-input" disabled placeholder="$ 0.00" /></label>
                    <label>Variant stock<input class="dash-input" disabled placeholder="0" /></label>
                  </div>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="image" [size]="18" style="color:#146242" /> Product Image</h2>
                  <p class="muted" style="font-size:12px;margin-bottom:12px">File upload isn't wired up yet — paste a hosted image URL instead. Left blank, the listing uses a placeholder like the ones already in the marketplace.</p>
                  <label>Image URL<input class="dash-input" name="productImage" [(ngModel)]="productForm.image" placeholder="https://..." /></label>
                </article>
              </div>

              <aside class="add-side">
                <span class="preview-label">Live Preview</span>
                <article class="product-preview">
                  @if (productForm.image) {
                    <img [src]="productForm.image" alt="Product preview" />
                  } @else {
                    <div class="img-placeholder" style="height:180px;display:flex;align-items:center;justify-content:center;background:#eee6d8;color:#8b8175;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">No image yet</div>
                  }
                  <div class="preview-body">
                    <small>{{ selectedCategoryName() || 'Category' }}</small>
                    <h3>{{ productForm.name || 'Product name preview' }}</h3>
                    <div class="preview-price">
                      <strong>{{ productForm.price ? ('$' + productForm.price.toFixed(2)) : '$0.00' }}</strong>
                      <span class="pill" [class.green]="productForm.stock > 0" [class.red]="productForm.stock <= 0">{{ productForm.stock > 0 ? 'In stock' : 'Out of stock' }}</span>
                    </div>
                  </div>
                </article>
                <article class="pro-tip">
                  <kc-icon name="lightbulb" [size]="22" />
                  <p style="margin:0;font-size:12px;font-weight:800;line-height:1.45">Pro Tip<br /><span style="font-weight:650">Clear photos and an honest description help buyers decide faster.</span></p>
                </article>
              </aside>
            </section>

            <div class="sticky-save">
              @if (savingProduct()) {
                <span class="autosave"><kc-icon name="clock" [size]="14" /> Saving…</span>
              }
              <div class="actions">
                <button class="btn btn-ghost" type="button" (click)="view.set('products')" [disabled]="savingProduct()">Cancel</button>
                <button class="btn btn-ghost" type="button" (click)="publishImmediately.set(false); saveProduct()" [disabled]="savingProduct()">Save as Draft</button>
                <button class="btn btn-primary" type="button" (click)="publishImmediately.set(true); saveProduct()" [disabled]="savingProduct()">Save Product</button>
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
              @for (metric of metrics; track metric.label) {
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
                <div class="field-control"><kc-icon name="search" [size]="15" /> Order ID or Customer Name</div>
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
                  @for (order of orders; track order.id) {
                    <tr>
                      <td><span class="order-id" (click)="selectedOrder.set(order)">{{ order.id }}</span></td>
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
                <span>Showing 1 to 3 of 12 orders</span>
                <div class="pagination"><span>&lt;</span><span class="current">1</span><span>2</span><span>&gt;</span></div>
              </div>
            </section>
          </main>
        } @else if (view() === 'reviews') {
          <main class="page reviews-layout">
            <h1 style="color:#146242">Reviews</h1>
            <p class="muted">See buyer ratings and comments for your products.</p>

            <section class="rating-row">
              <article class="rating-card average">
                <span>Average Rating</span>
                <strong>4.8</strong> <span style="display:inline;color:#6b756f;letter-spacing:0;text-transform:none">/ 5.0</span>
                <div class="stars-large">*****</div>
                <p class="muted" style="font-size:11px;margin-top:7px">Based on 45 total reviews</p>
              </article>

              <article class="rating-card dist">
                <h2>Rating Distribution</h2>
                @for (bar of bars; track bar.label) {
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
              @for (review of reviews; track review.name) {
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
                    <button type="button" (click)="startReviewReply(review.name)">Reply to buyer</button>
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
                  <img class="banner" src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=700&q=85" alt="Store banner" />
                  <div class="seller-card-body">
                    <img class="store-logo-preview" src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=180&q=85" alt="Store logo" />
                    <h2>Kosal's Khmer Creations</h2>
                    <div class="store-rating"><strong>★ 4.8</strong><span>Siem Reap, Cambodia</span></div>
                    <p>Bringing the soul of Angkor to your doorstep. We specialize in authentic, hand-woven silks and traditional...</p>
                    <span class="visit" title="Available after this account is connected to a public store"><kc-icon name="eye" [size]="15" /> Public link pending</span>
                  </div>
                </article>

                <article class="completion-card">
                  <div class="completion-head"><span>Profile Completion</span><span style="color:#146242">85%</span></div>
                  <div class="progress-line"><span></span></div>
                  <div class="check-list">
                    <span><kc-icon name="check" [size]="16" style="color:#146242" /> Logo & Banner Uploaded</span>
                    <span><kc-icon name="check" [size]="16" style="color:#146242" /> Store Description</span>
                    <span><kc-icon name="shield" [size]="16" style="color:#8c6a33" /> Verification Documents</span>
                  </div>
                </article>
              </div>

              <article class="profile-form">
                <div class="upload-row">
                  <div>
                    <label style="font-size:11px;font-weight:900">Store Logo</label>
                    <div class="upload-box">
                      <span class="upload-icon"><kc-icon name="file" [size]="24" /></span>
                      <strong>Replace Logo</strong>
                      SVG, PNG, JPG (Max. 2MB)
                    </div>
                  </div>
                  <div>
                    <label style="font-size:11px;font-weight:900">Store Banner</label>
                    <div class="upload-box">
                      <span class="upload-icon"><kc-icon name="image" [size]="24" /></span>
                      <strong>Upload New Banner</strong>
                      Recommended 1200×400px
                    </div>
                  </div>
                </div>

                <form class="dash-form">
                  <label>Store Name<input class="dash-input" value="Kosal's Khmer Creations" /></label>
                  <label>Description
                    <textarea class="dash-textarea">Bringing the soul of Angkor to your doorstep. We specialize in authentic, hand-woven silks and traditional pottery crafted by local artisans using century-old techniques. Our goal is to preserve Cambodian heritage while creating sustainable livelihoods for our community.</textarea>
                  </label>
                  <div class="two-cols">
                    <label>Location<input class="dash-input" value="Siem Reap, Cambodia" /></label>
                    <label>Phone Number<input class="dash-input" value="+855 12 345 678" /></label>
                  </div>
                  <div class="form-actions">
                    <button class="btn btn-ghost" type="button">Cancel</button>
                    <button class="btn btn-primary" type="button">Save Changes</button>
                  </div>
                </form>
              </article>
            </section>
          </main>
        } @else if (view() === 'sales') {
          <main class="page">
            <h1>Sales / Payout</h1>
            <p class="muted">Track your sales, commission, and seller earnings.</p>

            <section class="metrics" style="margin-top:28px">
              @for (metric of payoutMetrics; track metric.label) {
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
                <table>
                  <thead>
                    <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Commission (10%)</th><th>Earning</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (row of payouts; track row.id) {
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
                  <span>Showing 5 of 124 transactions</span>
                  <div class="pagination"><span>&lt;</span><span>&gt;</span></div>
                </div>
              </article>

              <aside>
                <article class="how-card">
                  <h2>How it works</h2>
                  <p>KhmerCraft empowers artisans with a simple, flat-fee commission structure to keep our community sustainable.</p>
                  <div class="calc-row"><span>Sale Price</span><strong>$100.00</strong></div>
                  <div class="calc-row"><span>Commission <small style="background:#e6ad69;color:#17382a;border-radius:999px;padding:2px 5px">10%</small></span><strong>-$10.00</strong></div>
                  <div class="earning">Your Earning $90.00</div>
                  <div class="info-note"><kc-icon name="info" [size]="15" /> Payouts are processed every Friday for delivered orders that have passed the 7-day return window.</div>
                </article>
                <article class="goal-card">
                  <h3>Next Payout Goal <strong>$1,000 threshold</strong></h3>
                  <div class="progress-line" style="margin:13px 0 9px"><span style="width:62%"></span></div>
                  <p class="muted" style="font-size:11px">$620.00 reached · $380.00 to go</p>
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
                      <label>Full Name<input class="dash-input" value="Sokha Reach" /></label>
                      <label>Email Address<input class="dash-input" value="sokha.reach@khmercraft.com" /></label>
                    </div>
                    <label>Phone Number<input class="dash-input" value="+855 12 345 678" /></label>
                    <div class="form-actions"><button class="btn btn-primary" type="button">Save Changes</button></div>
                  </form>
                </article>

                <article class="settings-card" style="margin-top:24px">
                  <h2><kc-icon name="lock" [size]="18" style="color:#146242" /> Security</h2>
                  <form class="settings-form">
                    <label>Current Password<input class="dash-input" type="password" [ngModel]="currentPassword()" (ngModelChange)="currentPassword.set($event)" name="currentPassword" autocomplete="current-password" /></label>
                    <div class="two-cols">
                      <label>New Password<input class="dash-input" type="password" [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)" name="newPassword" autocomplete="new-password" /></label>
                      <label>Confirm New Password<input class="dash-input" type="password" [ngModel]="confirmNewPassword()" (ngModelChange)="confirmNewPassword.set($event)" name="confirmNewPassword" autocomplete="new-password" /></label>
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

            <p class="portal-version">KhmerCraft Seller Portal v2.4.0 · Secured by TLS 1.3</p>
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
      <div class="backdrop" (click)="selectedOrder.set(null)">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Order Detail - {{ order.id }} <span class="status pending">Pending</span></h2>
            <button type="button" class="close" (click)="selectedOrder.set(null)">×</button>
          </header>
          <div class="modal-body">
            <div class="detail-grid">
              <article>
                <div class="detail-title"><kc-icon name="user" [size]="14" /> Buyer Info</div>
                <div class="detail-panel">
                  <div class="info-line"><span>Name:</span><span>Dara</span></div>
                  <div class="info-line"><span>Location:</span><span>Phnom Penh</span></div>
                  <div class="info-line"><span>Phone:</span><span>012 345 678</span></div>
                  <p class="note">"Please deliver after 5 PM if possible. Thank you!"</p>
                </div>
              </article>
              <article>
                <div class="detail-title"><kc-icon name="wallet" [size]="14" /> Payment Info</div>
                <div class="detail-panel">
                  <div class="info-line"><span>Method:</span><span>QR Payment</span></div>
                  <div class="info-line"><span>Status:</span><span style="color:#146242">Paid</span></div>
                  <div class="info-line"><span>Total Amount:</span><span style="color:#146242">$7.00</span></div>
                </div>
              </article>
            </div>

            <div class="detail-title"><kc-icon name="package" [size]="14" /> Product Details</div>
            <section class="product-detail">
              <div class="product-line">
                <img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=160&q=85" alt="Palm sugar pack" />
                <div>
                  <h3>Palm Sugar Pack</h3>
                  <p>Organic Khmer Sweetener</p>
                  <p>Qty: 2 * $3.50 ea</p>
                </div>
                <div class="subtotal">Subtotal<strong>$7.00</strong></div>
              </div>
            </section>

            <div class="detail-title">Update Order Status</div>
            <div class="modal-actions">
              <select><option>Pending</option><option>Shipped</option><option>Delivered</option></select>
              <button class="btn btn-ghost" type="button" (click)="selectedOrder.set(null)">Close</button>
              <button class="btn btn-primary" type="button" (click)="selectedOrder.set(null)">Update Status</button>
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class SellerDashboardPage {
  private readonly authService = inject(AuthService);
  private readonly api = inject(CommerceApiService);
  protected readonly view = signal<DashboardView>('dashboard');

  // ------------------------------------------------------------- products
  // Real data from here down — everything above (metrics, orders, sales,
  // reviews) is still the sample workspace preview; see the note at the top
  // of the template.
  protected readonly myProducts = signal<ApiProduct[]>([]);
  protected readonly myProductsTotal = signal(0);
  protected readonly loadingProducts = signal(false);
  protected readonly productsError = signal('');

  protected readonly activeProductCount = computed(
    () => this.myProducts().filter((product) => product.status === 'ACTIVE').length,
  );
  protected readonly activeProductPercent = computed(() => {
    const total = this.myProductsTotal();
    return total ? Math.round((this.activeProductCount() / total) * 100) : 0;
  });

  constructor() {
    this.loadMyProducts();
  }

  protected loadMyProducts(): void {
    this.loadingProducts.set(true);
    this.productsError.set('');
    this.api.myProducts(1, 50).subscribe({
      next: (result) => {
        this.myProducts.set(result.products);
        this.myProductsTotal.set(result.total);
        this.loadingProducts.set(false);
      },
      error: (error) => {
        this.productsError.set(apiErrorMessage(error, 'Could not load your products.'));
        this.loadingProducts.set(false);
      },
    });
  }

  protected productForm = {
    name: '',
    description: '',
    price: null as number | null,
    stock: 0,
    location: '',
    image: '',
  };
  protected readonly publishImmediately = signal(true);
  protected readonly savingProduct = signal(false);
  protected readonly saveProductError = signal('');

  protected togglePublishImmediately(): void {
    this.publishImmediately.update((value) => !value);
  }

  protected saveProduct(): void {
    const name = this.productForm.name.trim();
    const category = this.selectedCategory();
    const price = this.productForm.price;

    if (!name || !category || price === null || price <= 0) {
      this.saveProductError.set(
        'Product name, category and a price greater than $0 are required.',
      );
      return;
    }

    this.savingProduct.set(true);
    this.saveProductError.set('');

    this.api
      .createProduct({
        name,
        description: this.productForm.description.trim() || undefined,
        price,
        category,
        subcategory: this.subcategoryValue() || undefined,
        location: this.productForm.location.trim() || undefined,
        image: this.productForm.image.trim() || undefined,
        stock: this.productForm.stock,
        status: this.publishImmediately() ? 'ACTIVE' : 'DRAFT',
      })
      .subscribe({
        next: () => {
          this.savingProduct.set(false);
          this.resetProductForm();
          this.loadMyProducts();
          this.view.set('products');
        },
        error: (error) => {
          this.saveProductError.set(apiErrorMessage(error, 'Could not create the product.'));
          this.savingProduct.set(false);
        },
      });
  }

  private resetProductForm(): void {
    this.productForm = { name: '', description: '', price: null, stock: 0, location: '', image: '' };
    this.selectedCategory.set('');
    this.subcategoryValue.set('');
    this.publishImmediately.set(true);
  }
  protected readonly selectedOrder = signal<SellerOrder | null>(null);
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');
  protected readonly productCategories = CATEGORIES;
  protected readonly selectedCategory = signal('');
  protected readonly subcategoryValue = signal('');
  protected readonly selectedSubcategories = computed(
    () => CATEGORIES.find((category) => category.slug === this.selectedCategory())?.subcategories ?? [],
  );
  protected readonly selectedCategoryName = computed(
    () => CATEGORIES.find((category) => category.slug === this.selectedCategory())?.name ?? '',
  );

  protected setProductCategory(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    // A subcategory from the old category no longer makes sense once the
    // category itself changes.
    this.subcategoryValue.set('');
  }

  protected setProductSubcategory(event: Event): void {
    this.subcategoryValue.set((event.target as HTMLSelectElement).value);
  }

  protected startReviewReply(buyerName: string): void {
    window.alert(`Reply editor for ${buyerName} is ready for backend integration.`);
  }

  protected updatePassword(): void {
    if (!this.currentPassword() || !this.newPassword() || !this.confirmNewPassword()) {
      window.alert('Please fill in all password fields.');
      return;
    }
    if (this.newPassword() !== this.confirmNewPassword()) {
      window.alert('New passwords do not match.');
      return;
    }

    this.authService
      .changePassword(
        this.currentPassword(),
        this.newPassword(),
        this.confirmNewPassword(),
      )
      .subscribe({
        next: () => {
          window.alert('Password updated successfully.');
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmNewPassword.set('');
        },
        error: (error) => window.alert(apiErrorMessage(error, 'Failed to update password.')),
      });
  }

  protected readonly navItems: Array<{ view: DashboardView; label: string; icon: string }> = [
    { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { view: 'products', label: 'Products', icon: 'box' },
    { view: 'add', label: 'Add Product', icon: 'plus-square' },
    { view: 'orders', label: 'Orders', icon: 'cart' },
    { view: 'profile', label: 'Store Profile', icon: 'store' },
    { view: 'sales', label: 'Sales / Payout', icon: 'wallet' },
    { view: 'reviews', label: 'Reviews', icon: 'review' },
    { view: 'settings', label: 'Settings', icon: 'settings' },
  ];

  protected readonly metrics: DashboardMetric[] = [
    { label: 'Pending Orders', value: '12', icon: 'clipboard' },
    { label: 'In Transit', value: '45', icon: 'truck', warn: true },
    { label: 'Completed (30d)', value: '184', icon: 'check' },
    { label: 'Revenue (MTD)', value: '$2,450.00', icon: 'wallet', gold: true },
  ];

  protected readonly dashboardMetrics: DashboardMetric[] = [
    { label: 'Total Products', value: '24', note: '+2 this month', icon: 'box' },
    { label: 'Total Orders', value: '128', note: '+12% from last week', icon: 'cart' },
    { label: 'Pending Orders', value: '8', note: 'Requires Action', icon: 'clipboard', warn: true },
    { label: 'Total Sales', value: '$2,450', note: 'Lifetime', icon: 'chart' },
    { label: 'Seller Earnings', value: '$2,205', note: 'Next payout in 3 days', icon: 'wallet', gold: true },
  ];

  protected readonly dashboardOrders = [
    { id: 'KC-0001', buyer: 'Vannak Som', product: 'Handmade Basket', qty: 2, total: '$45.00', status: 'PENDING' },
    { id: 'KC-0002', buyer: 'Chanlina Keo', product: 'Palm Sugar Pack', qty: 5, total: '$12.50', status: 'SHIPPED' },
    { id: 'KC-0003', buyer: 'Davith Heng', product: 'Clay Pottery Cup', qty: 1, total: '$8.00', status: 'DELIVERED' },
  ];

  protected readonly lowStock = [
    {
      name: 'Palm Sugar Pack',
      left: 3,
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&q=85',
    },
    {
      name: 'Handmade Basket',
      left: 2,
      image: 'https://images.unsplash.com/photo-1595428774223-ef52624120e2?w=120&q=85',
    },
    {
      name: 'Clay Pottery Cup',
      left: 4,
      image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=120&q=85',
    },
  ];

  protected readonly products = [
    {
      name: 'Handmade Khmer Scarf',
      sku: 'SKU-TEX-001',
      category: 'Textiles',
      price: '$12.50',
      stock: 42,
      status: 'ACTIVE',
      image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=120&q=85',
    },
    {
      name: 'Palm Sugar Pack',
      sku: 'SKU-FD-902',
      category: 'Food & Drink',
      price: '$3.50',
      stock: 5,
      status: 'LOW STOCK',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&q=85',
    },
    {
      name: 'Clay Pottery Cup',
      sku: 'SKU-POT-443',
      category: 'Pottery',
      price: '$6.00',
      stock: 0,
      status: 'OUT OF STOCK',
      image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=120&q=85',
    },
  ];

  protected readonly payoutMetrics: DashboardMetric[] = [
    { label: 'Total Sales', value: '$2,450', note: '+12% vs last month', icon: 'chart' },
    { label: 'Platform Commission', value: '$245', note: '10% standard rate', icon: 'percent', warn: true },
    { label: 'Seller Earnings', value: '$2,205', note: 'Ready for payout', icon: 'wallet' },
    { label: 'Pending Payout', value: '$620', note: 'Request payout', icon: 'calendar', warn: true },
  ];

  protected readonly orders: SellerOrder[] = [
    {
      id: 'KC-0001',
      buyer: 'Sokha Meas',
      initials: 'SM',
      color: '#f0a36e',
      product: 'Hand-Woven Silk Scarf (Indigo)',
      qty: 2,
      total: '$76.00',
      address: 'Phnom Penh, St. 21',
      date: 'Oct 24, 2023',
      status: 'Pending',
      statusClass: 'pending',
    },
    {
      id: 'KC-0002',
      buyer: 'Kosal Van',
      initials: 'KV',
      color: '#dfe8ff',
      product: 'Angkor Ceramic Bowl Set',
      qty: 1,
      total: '$120.00',
      address: 'Siem Reap, Wat Bo',
      date: 'Oct 23, 2023',
      status: 'Shipped',
      statusClass: 'shipped',
    },
    {
      id: 'KC-0003',
      buyer: 'Bopha Thul',
      initials: 'BT',
      color: '#9de8bd',
      product: 'Silver Inlaid Jewelry Box',
      qty: 1,
      total: '$245.00',
      address: 'Battambang, Sangkat',
      date: 'Oct 22, 2023',
      status: 'Delivered',
      statusClass: 'delivered',
    },
  ];

  protected readonly bars = [
    { label: '5 Stars', width: '86%', count: 38 },
    { label: '4 Stars', width: '14%', count: 5 },
    { label: '3 Stars', width: '6%', count: 2, low: true },
    { label: '2 Stars', width: '0%', count: 0 },
  ];

  protected readonly payouts = [
    { id: '#KC-8942', date: 'Oct 24, 2023', total: '$120.00', commission: '-$12.00', earning: '$108.00', status: 'PAID' },
    { id: '#KC-8945', date: 'Oct 25, 2023', total: '$85.00', commission: '-$8.50', earning: '$76.50', status: 'PENDING' },
    { id: '#KC-8949', date: 'Oct 25, 2023', total: '$350.00', commission: '-$35.00', earning: '$315.00', status: 'PENDING' },
    { id: '#KC-8930', date: 'Oct 22, 2023', total: '$210.00', commission: '-$21.00', earning: '$189.00', status: 'PAID' },
    { id: '#KC-8921', date: 'Oct 20, 2023', total: '$45.00', commission: '-$4.50', earning: '$40.50', status: 'PAID' },
  ];

  protected readonly reviews = [
    {
      name: 'Dara',
      initial: 'D',
      color: '#ffd2b5',
      product: 'Handmade Khmer Scarf',
      date: 'October 24, 2023',
      text:
        'Good quality and beautiful product. The silk is incredibly soft and the patterns are authentic. Highly recommend this artisan!',
    },
    {
      name: 'Sokha M.',
      initial: 'S',
      color: '#f7d777',
      product: 'Ceramic Lotus Vase',
      date: 'October 21, 2023',
      text:
        'The craftsmanship is superb. My only minor issue was the shipping took a little longer than expected, but the product was worth the wait.',
      response:
        'Thank you for your feedback, Sokha! We are glad you love the vase. We are working on optimizing our shipping partner to ensure faster delivery next time.',
    },
    {
      name: 'Vannak',
      initial: 'V',
      color: '#a9efc8',
      product: 'Woven Bamboo Basket Set',
      date: 'October 15, 2023',
      text:
        'These baskets look even better in person. Perfectly functional and adds a nice rustic touch to my kitchen.',
      image: 'https://images.unsplash.com/photo-1595428774223-ef52624120e2?w=160&q=85',
    },
  ];

  protected currentTitle(): string {
    return this.navItems.find((item) => item.view === this.view())?.label ?? 'Dashboard';
  }
}
