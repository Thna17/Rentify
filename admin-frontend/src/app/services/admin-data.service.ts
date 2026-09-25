import { Injectable, computed, signal } from '@angular/core';
import { ago } from '../ui/format';

export interface Buyer {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  status: 'active' | 'suspended' | 'deactivated';
}

export interface Seller {
  id: string;
  store: string;
  name: string;
  email: string;
  appliedAt: string;
  verification: 'verified' | 'pending' | 'rejected';
  status: 'active' | 'suspended' | 'pending';
}

export interface Product {
  id: string;
  name: string;
  sellerId: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  status: 'active' | 'pending' | 'hidden' | 'rejected';
  reported?: boolean;
}

export interface Category {
  id: string;
  name: string;
  status: 'active' | 'hidden';
}

export interface Order {
  id: string;
  buyer: string;
  seller: string;
  items: string;
  total: number;
  payment: 'completed' | 'pending' | 'failed' | 'refunded';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  placedAt: string;
}

export interface Review {
  id: string;
  product: string;
  buyer: string;
  rating: number;
  comment: string;
  status: 'visible' | 'hidden';
  date: string;
}

export interface Payment {
  id: string;
  order: string;
  buyer: string;
  method: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: string;
}

export interface Tx {
  id: string;
  type: 'Commission' | 'Boost fee' | 'Payout' | 'Refund' | 'Subscription';
  description: string;
  amount: number;
  dir: 'in' | 'out';
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

export interface Payout {
  id: string;
  seller: string;
  amount: number;
  requestedAt: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Report {
  id: string;
  kind: 'Product' | 'Seller' | 'Buyer';
  target: string;
  reporter: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  date: string;
  notes: { text: string; date: string }[];
}

export interface Complaint {
  id: string;
  order: string;
  from: string;
  subject: string;
  status: 'open' | 'investigating' | 'resolved';
  date: string;
}

export interface Log {
  id: string;
  actor: string;
  action: string;
  kind: string;
  date: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  audience: string;
  date: string;
}

// Platform / Storefront models
export interface WebsiteTemplate {
  id: string;
  name: string;
  category: 'ecommerce' | 'portfolio' | 'services';
  framework: string;
  baseUrl: string;
  description: string;
  features: string[];
  colorPalette: { primary: string; secondary: string; accent?: string; background: string };
  status: 'active' | 'hidden';
  storesUsing: number;
}

export interface PlatformWebsite {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  ownerId: string;
  ownerName: string;
  templateId: string;
  templateName: string;
  status: 'active' | 'suspended';
  limits: { staff: number; storage: number; products: number };
  currentUsage: { staff: number; storage: number; products: number };
  createdAt: string;
}

export interface PlatformSubscription {
  id: string;
  storeName: string;
  ownerName: string;
  plan: 'Free Trial' | 'Growth' | 'Enterprise';
  price: number;
  billingCycle: 'monthly' | 'annual' | 'trial';
  status: 'active' | 'trial' | 'past_due' | 'cancelled';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'user' | 'staff';
  status: 'active' | 'suspended';
  isVerified: boolean;
  registeredAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  ready = signal(false);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
  }

  // Marketplace signals
  buyers = signal<Buyer[]>([
    { id: 'B-101', name: 'Srey Neang', email: 'srey.neang@gmail.com', registeredAt: ago(160), status: 'active' },
    { id: 'B-102', name: 'Kunthea Ros', email: 'kunthea.ros@gmail.com', registeredAt: ago(140), status: 'active' },
    { id: 'B-103', name: 'Dara Chan', email: 'dara.chan@gmail.com', registeredAt: ago(120), status: 'active' },
    { id: 'B-104', name: 'Maly Vong', email: 'maly.vong@gmail.com', registeredAt: ago(95), status: 'suspended' },
    { id: 'B-105', name: 'Sokha Lim', email: 'sokha.lim@gmail.com', registeredAt: ago(70), status: 'active' },
    { id: 'B-106', name: 'Rithy Panh', email: 'rithy.panh@gmail.com', registeredAt: ago(30), status: 'active' },
    { id: 'B-107', name: 'Bopha Sok', email: 'bopha.sok@gmail.com', registeredAt: ago(9), status: 'active' },
  ]);

  sellers = signal<Seller[]>([
    { id: 'S-01', store: 'Angkor Crafts', name: 'Vibol Chea', email: 'vibol@angkorcrafts.kh', appliedAt: ago(170), verification: 'verified', status: 'active' },
    { id: 'S-02', store: 'Siem Reap Silk Studio', name: 'Sopheap Meas', email: 'sopheap@srsk.kh', appliedAt: ago(150), verification: 'verified', status: 'active' },
    { id: 'S-03', store: 'Battambang Pottery', name: 'Vanna Sok', email: 'vanna@bbpottery.kh', appliedAt: ago(110), verification: 'pending', status: 'active' },
    { id: 'S-04', store: 'Kampong Thom Carvings', name: 'Rithya Men', email: 'rithya@ktcarve.kh', appliedAt: ago(90), verification: 'pending', status: 'active' },
    { id: 'S-05', store: 'Phnom Penh Silverworks', name: 'Sokunthea Keo', email: 'kunthea@ppsilver.kh', appliedAt: ago(80), verification: 'verified', status: 'suspended' },
    { id: 'S-06', store: 'Tonle Craft Co.', name: 'Maly Vong', email: 'maly@tonlecraft.kh', appliedAt: ago(3), verification: 'pending', status: 'pending' },
    { id: 'S-07', store: 'Kampot Palm Goods', name: 'Chanthy Nhem', email: 'chanthy@kampotpalm.kh', appliedAt: ago(1), verification: 'pending', status: 'pending' },
  ]);

  products = signal<Product[]>([
    { id: 'P-1001', name: 'Hand-Woven Krama Scarf', sellerId: 'S-01', category: 'Textiles', price: 12, stock: 42, sold: 118, status: 'active' },
    { id: 'P-1002', name: 'Khmer Silk Table Runner', sellerId: 'S-02', category: 'Textiles', price: 28, stock: 3, sold: 64, status: 'active' },
    { id: 'P-1003', name: 'Apsara Wood Carving', sellerId: 'S-04', category: 'Carvings', price: 85, stock: 12, sold: 41, status: 'active' },
    { id: 'P-1004', name: 'Silver Filigree Ring', sellerId: 'S-05', category: 'Jewelry', price: 45, stock: 20, sold: 77, status: 'active', reported: true },
    { id: 'P-1005', name: 'Rattan Basket', sellerId: 'S-03', category: 'Gift Sets', price: 18, stock: 4, sold: 52, status: 'active' },
    { id: 'P-1006', name: 'Palm Sugar Gift Set', sellerId: 'S-03', category: 'Gift Sets', price: 22, stock: 60, sold: 90, status: 'active', reported: true },
    { id: 'P-1007', name: 'Sandstone Elephant Statue', sellerId: 'S-04', category: 'Carvings', price: 120, stock: 6, sold: 23, status: 'active' },
    { id: 'P-1008', name: 'Glazed Ceramic Vase', sellerId: 'S-03', category: 'Artwork', price: 34, stock: 2, sold: 47, status: 'active' },
    { id: 'P-1009', name: 'Traditional Khmer Painting', sellerId: 'S-01', category: 'Artwork', price: 60, stock: 9, sold: 18, status: 'active' },
    { id: 'P-1010', name: 'Krama Cotton Scarf — Red', sellerId: 'S-02', category: 'Textiles', price: 10, stock: 80, sold: 0, status: 'pending' },
    { id: 'P-1011', name: 'Brass Temple Bell', sellerId: 'S-05', category: 'Jewelry', price: 38, stock: 15, sold: 12, status: 'hidden' },
    { id: 'P-1012', name: 'Gift Box: Krama + Palm Sugar', sellerId: 'S-01', category: 'Gift Sets', price: 30, stock: 25, sold: 5, status: 'pending' },
  ]);

  categories = signal<Category[]>([
    { id: 'C-1', name: 'Textiles', status: 'active' },
    { id: 'C-2', name: 'Carvings', status: 'active' },
    { id: 'C-3', name: 'Jewelry', status: 'active' },
    { id: 'C-4', name: 'Artwork', status: 'active' },
    { id: 'C-5', name: 'Gift Sets', status: 'active' },
    { id: 'C-6', name: 'Home Decor', status: 'hidden' },
  ]);

  orders = signal<Order[]>([
    { id: 'ORD-5001', buyer: 'Srey Neang', seller: 'Angkor Crafts', items: '2× Hand-Woven Krama Scarf', total: 24, payment: 'completed', status: 'completed', placedAt: ago(155) },
    { id: 'ORD-5002', buyer: 'Kunthea Ros', seller: 'Siem Reap Silk Studio', items: '1× Khmer Silk Table Runner', total: 28, payment: 'completed', status: 'completed', placedAt: ago(130) },
    { id: 'ORD-5003', buyer: 'Dara Chan', seller: 'Phnom Penh Silverworks', items: '1× Silver Filigree Ring', total: 45, payment: 'completed', status: 'completed', placedAt: ago(115) },
    { id: 'ORD-5004', buyer: 'Srey Neang', seller: 'Kampong Thom Carvings', items: '1× Apsara Wood Carving', total: 85, payment: 'completed', status: 'completed', placedAt: ago(92) },
    { id: 'ORD-5005', buyer: 'Maly Vong', seller: 'Battambang Pottery', items: '2× Rattan Basket, 1× Ceramic Vase', total: 70, payment: 'completed', status: 'completed', placedAt: ago(76) },
    { id: 'ORD-5006', buyer: 'Sokha Lim', seller: 'Battambang Pottery', items: '2× Palm Sugar Gift Set', total: 44, payment: 'refunded', status: 'cancelled', placedAt: ago(64) },
    { id: 'ORD-5007', buyer: 'Kunthea Ros', seller: 'Angkor Crafts', items: '1× Gift Box: Krama + Palm Sugar', total: 30, payment: 'completed', status: 'completed', placedAt: ago(47) },
    { id: 'ORD-5008', buyer: 'Rithy Panh', seller: 'Kampong Thom Carvings', items: '1× Sandstone Elephant Statue', total: 120, payment: 'failed', status: 'processing', placedAt: ago(12) },
    { id: 'ORD-5009', buyer: 'Dara Chan', seller: 'Siem Reap Silk Studio', items: '1× Table Runner, 1× Krama Scarf', total: 40, payment: 'pending', status: 'pending', placedAt: ago(5) },
    { id: 'ORD-5010', buyer: 'Bopha Sok', seller: 'Angkor Crafts', items: '1× Hand-Woven Krama Scarf', total: 12, payment: 'pending', status: 'pending', placedAt: ago(2) },
  ]);

  reviews = signal<Review[]>([
    { id: 'R-1', product: 'Hand-Woven Krama Scarf', buyer: 'Srey Neang', rating: 5, comment: 'Beautiful weave, exactly as pictured.', status: 'visible', date: ago(150) },
    { id: 'R-2', product: 'Silver Filigree Ring', buyer: 'Dara Chan', rating: 4, comment: 'Lovely detail, sizing runs small.', status: 'visible', date: ago(110) },
    { id: 'R-3', product: 'Apsara Wood Carving', buyer: 'Srey Neang', rating: 2, comment: 'Smaller than expected for the price.', status: 'visible', date: ago(88) },
    { id: 'R-4', product: 'Glazed Ceramic Vase', buyer: 'Maly Vong', rating: 5, comment: 'Gorgeous glaze. Careful packaging.', status: 'hidden', date: ago(70) },
    { id: 'R-5', product: 'Palm Sugar Gift Set', buyer: 'Kunthea Ros', rating: 5, comment: 'Great gift, family loved it.', status: 'visible', date: ago(40) },
  ]);

  payments = signal<Payment[]>([
    { id: 'PAY-01', order: 'ORD-5001', buyer: 'Srey Neang', method: 'Cash on Delivery', amount: 24, status: 'completed', date: ago(154) },
    { id: 'PAY-02', order: 'ORD-5002', buyer: 'Kunthea Ros', method: 'Cash on Delivery', amount: 28, status: 'completed', date: ago(129) },
    { id: 'PAY-03', order: 'ORD-5003', buyer: 'Dara Chan', method: 'Bank Transfer', amount: 45, status: 'completed', date: ago(114) },
    { id: 'PAY-04', order: 'ORD-5004', buyer: 'Srey Neang', method: 'Cash on Pickup', amount: 85, status: 'completed', date: ago(91) },
    { id: 'PAY-05', order: 'ORD-5005', buyer: 'Maly Vong', method: 'Cash on Delivery', amount: 70, status: 'completed', date: ago(75) },
    { id: 'PAY-06', order: 'ORD-5006', buyer: 'Sokha Lim', method: 'Cash on Delivery', amount: 44, status: 'refunded', date: ago(63) },
    { id: 'PAY-07', order: 'ORD-5007', buyer: 'Kunthea Ros', method: 'Cash on Pickup', amount: 30, status: 'completed', date: ago(46) },
    { id: 'PAY-08', order: 'ORD-5008', buyer: 'Rithy Panh', method: 'Bank Transfer', amount: 120, status: 'failed', date: ago(11) },
    { id: 'PAY-09', order: 'ORD-5009', buyer: 'Dara Chan', method: 'Cash on Delivery', amount: 40, status: 'pending', date: ago(4) },
    { id: 'PAY-10', order: 'ORD-510', buyer: 'Bopha Sok', method: 'Cash on Delivery', amount: 12, status: 'pending', date: ago(1) },
  ]);

  txs = signal<Tx[]>([
    { id: 'T-01', type: 'Boost fee', description: 'Boost — Hand-Woven Krama Scarf (Angkor Crafts)', amount: 25, dir: 'in', status: 'completed', date: ago(150) },
    { id: 'T-02', type: 'Commission', description: '10% commission — ORD-5001', amount: 2.4, dir: 'in', status: 'completed', date: ago(154) },
    { id: 'T-03', type: 'Boost fee', description: 'Boost — Khmer Silk Table Runner (SR Silk)', amount: 25, dir: 'in', status: 'completed', date: ago(125) },
    { id: 'T-04', type: 'Commission', description: '10% commission — ORD-5002', amount: 2.8, dir: 'in', status: 'completed', date: ago(129) },
    { id: 'T-05', type: 'Commission', description: '10% commission — ORD-5003', amount: 4.5, dir: 'in', status: 'completed', date: ago(114) },
    { id: 'T-06', type: 'Payout', description: 'Seller payout — Angkor Crafts', amount: 186, dir: 'out', status: 'completed', date: ago(100) },
    { id: 'T-07', type: 'Boost fee', description: 'Boost — Apsara Wood Carving (KT Carvings)', amount: 25, dir: 'in', status: 'completed', date: ago(90) },
    { id: 'T-08', type: 'Commission', description: '10% commission — ORD-5004', amount: 8.5, dir: 'in', status: 'completed', date: ago(91) },
    { id: 'T-09', type: 'Commission', description: '10% commission — ORD-5005', amount: 7, dir: 'in', status: 'completed', date: ago(75) },
    { id: 'T-10', type: 'Refund', description: 'Refund — ORD-5006', amount: 44, dir: 'out', status: 'completed', date: ago(60) },
    { id: 'T-11', type: 'Boost fee', description: 'Boost — Palm Sugar Gift Set (BB Pottery)', amount: 25, dir: 'in', status: 'completed', date: ago(55) },
    { id: 'T-12', type: 'Commission', description: '10% commission — ORD-5007', amount: 3, dir: 'in', status: 'completed', date: ago(46) },
    { id: 'T-13', type: 'Boost fee', description: 'Boost — Silver Filigree Ring (PP Silverworks)', amount: 25, dir: 'in', status: 'completed', date: ago(35) },
    { id: 'T-14', type: 'Payout', description: 'Seller payout — Siem Reap Silk Studio', amount: 96, dir: 'out', status: 'completed', date: ago(28) },
    { id: 'T-15', type: 'Boost fee', description: 'Boost — Sandstone Elephant (KT Carvings)', amount: 25, dir: 'in', status: 'completed', date: ago(10) },
    { id: 'T-16', type: 'Payout', description: 'Seller payout — Phnom Penh Silverworks', amount: 60, dir: 'out', status: 'failed', date: ago(8) },
    { id: 'T-17', type: 'Subscription', description: 'Monthly Growth Plan — Aura Botanicals', amount: 29, dir: 'in', status: 'completed', date: ago(15) },
    { id: 'T-18', type: 'Subscription', description: 'Monthly Enterprise Plan — NexTech Electronics', amount: 99, dir: 'in', status: 'completed', date: ago(10) },
  ]);

  payouts = signal<Payout[]>([
    { id: 'PO-1', seller: 'Angkor Crafts', amount: 186, requestedAt: ago(101), status: 'completed' },
    { id: 'PO-2', seller: 'Siem Reap Silk Studio', amount: 96, requestedAt: ago(29), status: 'completed' },
    { id: 'PO-3', seller: 'Battambang Pottery', amount: 74, requestedAt: ago(4), status: 'pending' },
    { id: 'PO-4', seller: 'Kampong Thom Carvings', amount: 150, requestedAt: ago(3), status: 'pending' },
    { id: 'PO-5', seller: 'Phnom Penh Silverworks', amount: 60, requestedAt: ago(9), status: 'failed' },
  ]);

  reports = signal<Report[]>([
    { id: 'RP-1', kind: 'Product', target: 'Silver Filigree Ring', reporter: 'Dara Chan', reason: 'Suspected mass-produced, not handmade.', status: 'open', date: ago(6), notes: [] },
    { id: 'RP-2', kind: 'Seller', target: 'Phnom Penh Silverworks', reporter: 'Maly Vong', reason: 'Not responding to buyer messages.', status: 'open', date: ago(8), notes: [] },
    { id: 'RP-3', kind: 'Product', target: 'Palm Sugar Gift Set', reporter: 'Srey Neang', reason: 'Labelled weight differs from actual.', status: 'open', date: ago(2), notes: [] },
    { id: 'RP-4', kind: 'Product', target: 'Glazed Ceramic Vase', reporter: 'Kunthea Ros', reason: 'Arrived cracked, poor packaging.', status: 'resolved', date: ago(30), notes: [{ text: 'Seller re-packaged; buyer compensated.', date: ago(28) }] },
    { id: 'RP-5', kind: 'Buyer', target: 'Sokha Lim', reporter: 'Battambang Pottery', reason: 'Abusive language in messages.', status: 'dismissed', date: ago(45), notes: [] },
  ]);

  complaints = signal<Complaint[]>([
    { id: 'CP-1', order: 'ORD-5006', from: 'Sokha Lim', subject: 'Refund not received yet.', status: 'investigating', date: ago(20) },
    { id: 'CP-2', order: 'ORD-5010', from: 'Bopha Sok', subject: 'Seller cancelled after COD arranged.', status: 'open', date: ago(1) },
    { id: 'CP-3', order: 'ORD-5008', from: 'Rithy Panh', subject: 'Payment shows failed but cash paid.', status: 'open', date: ago(2) },
    { id: 'CP-4', order: 'ORD-5005', from: 'Maly Vong', subject: 'Basket colour different from photo.', status: 'resolved', date: ago(60) },
  ]);

  logs = signal<Log[]>([
    { id: 'L-01', actor: 'System', action: 'Payment failed for ORD-5008 (Bank Transfer)', kind: 'failed', date: ago(11) },
    { id: 'L-02', actor: 'Admin (Rentify)', action: 'Suspended buyer Maly Vong', kind: 'suspended', date: ago(9) },
    { id: 'L-03', actor: 'System', action: 'Seller registered: Tonle Craft Co.', kind: 'pending', date: ago(3) },
    { id: 'L-04', actor: 'System', action: 'Seller registered: Kampot Palm Goods', kind: 'pending', date: ago(1) },
    { id: 'L-05', actor: 'System', action: 'Buyer registered: Bopha Sok', kind: 'active', date: ago(9) },
    { id: 'L-06', actor: 'Admin (Rentify)', action: 'Resolved report RP-4 (Ceramic Vase)', kind: 'resolved', date: ago(28) },
    { id: 'L-07', actor: 'System', action: 'Payout PO-5 to Phnom Penh Silverworks failed', kind: 'failed', date: ago(8) },
    { id: 'L-08', actor: 'Admin (Rentify)', action: 'Completed payout PO-2 ($96)', kind: 'completed', date: ago(28) },
    { id: 'L-09', actor: 'System', action: 'Order ORD-5010 placed ($12)', kind: 'pending', date: ago(2) },
    { id: 'L-10', actor: 'Admin (Rentify)', action: 'Published template Skin Care Website', kind: 'active', date: ago(15) },
  ]);

  notices = signal<Notice[]>([
    { id: 'N-1', title: 'Scheduled maintenance — Oct 1', body: 'Platform will be read-only 01:00–03:00 UTC.', audience: 'Everyone', date: ago(4) },
    { id: 'N-2', title: 'New boost pricing', body: '7-day listing boost remains $25 flat.', audience: 'Sellers', date: ago(20) },
    { id: 'N-3', title: 'Storefront Template 2 deployed', body: 'Technology Shop template is now live on port 4600.', audience: 'Platform', date: ago(25) },
  ]);

  // Platform & Storefront signals
  templates = signal<WebsiteTemplate[]>([
    {
      id: '044c94e2-a47c-47d5-895b-33bc00eb5abb',
      name: 'Skin Care Website (Template 1)',
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4700',
      description: 'A sleek and modern e-commerce template designed for skincare and wellness brands. Featuring clean layouts, product grids, and checkout.',
      features: ['Responsive Design', 'SEO Optimized', 'Dark Mode Support', 'Integrated E-commerce'],
      colorPalette: { primary: '#2D6A4F', secondary: '#52B788', accent: '#D8F3DC', background: '#F8F9FA' },
      status: 'active',
      storesUsing: 14,
    },
    {
      id: 'af3e0202-6327-45b1-bece-02ab3aba4a05',
      name: 'Technology Shop Website (Template 2)',
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4600',
      description: 'A high performance template built for electronics, gadgets, and tech shops with spec tables and fast filtering.',
      features: ['Fully Responsive', 'SEO Ready', 'Dark Mode Available', 'Tech Specs & Reviews'],
      colorPalette: { primary: '#2563EB', secondary: '#3B82F6', accent: '#DBEAFE', background: '#0F172A' },
      status: 'active',
      storesUsing: 8,
    },
    {
      id: 'bf5e1303-7438-56c2-cfdf-13bc4bcb5b16',
      name: 'Artisan & Craft Studio (Template 3)',
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4700',
      description: 'Rich story-telling layout highlighting handmade goods, artisan biographies, and authentic craftsmanship.',
      features: ['Storytelling Hero', 'Artisan Showcase', 'Custom Fonts', 'Bespoke Order Inquiries'],
      colorPalette: { primary: '#8a1e2c', secondary: '#bb3434', accent: '#f8eef0', background: '#fffdf8' },
      status: 'active',
      storesUsing: 5,
    },
  ]);

  websites = signal<PlatformWebsite[]>([
    {
      id: '7b8f9e01-2a3b-4c5d-8e9f-0a1b2c3d4e5f',
      name: 'Aura Botanicals',
      domain: 'aura-botanicals.rentifystore.shop',
      subdomain: 'aura-botanicals',
      ownerId: '22222222-2222-4222-8222-222222222222',
      ownerName: 'Sarah Skincare Merchant',
      templateId: '044c94e2-a47c-47d5-895b-33bc00eb5abb',
      templateName: 'Skin Care Website',
      status: 'active',
      limits: { staff: 2, storage: 1024, products: 50 },
      currentUsage: { staff: 1, storage: 120, products: 6 },
      createdAt: ago(180),
    },
    {
      id: '8c90a1b2-3b4c-5d6e-9f0a-1b2c3d4e5f60',
      name: 'NexTech Electronics',
      domain: 'nextech.rentifystore.shop',
      subdomain: 'nextech',
      ownerId: '55555555-5555-4555-8555-555555555555',
      ownerName: 'Alex Tech Merchant',
      templateId: 'af3e0202-6327-45b1-bece-02ab3aba4a05',
      templateName: 'Technology Shop Website',
      status: 'active',
      limits: { staff: 5, storage: 5120, products: 500 },
      currentUsage: { staff: 2, storage: 450, products: 28 },
      createdAt: ago(120),
    },
    {
      id: '9d01b2c3-4c5d-6e7f-0a1b-2c3d4e5f6071',
      name: 'Angkor Silk Studio',
      domain: 'angkorsilk.rentifystore.shop',
      subdomain: 'angkorsilk',
      ownerId: 'S-01',
      ownerName: 'Vibol Chea',
      templateId: '044c94e2-a47c-47d5-895b-33bc00eb5abb',
      templateName: 'Skin Care Website',
      status: 'active',
      limits: { staff: 2, storage: 1024, products: 50 },
      currentUsage: { staff: 1, storage: 85, products: 12 },
      createdAt: ago(60),
    },
    {
      id: 'ae12c3d4-5d6e-7f80-1b2c-3d4e5f607182',
      name: 'Battambang Ceramics',
      domain: 'bbceramics.rentifystore.shop',
      subdomain: 'bbceramics',
      ownerId: 'S-03',
      ownerName: 'Vanna Sok',
      templateId: 'bf5e1303-7438-56c2-cfdf-13bc4bcb5b16',
      templateName: 'Artisan & Craft Studio',
      status: 'active',
      limits: { staff: 2, storage: 1024, products: 50 },
      currentUsage: { staff: 1, storage: 140, products: 18 },
      createdAt: ago(40),
    },
  ]);

  subscriptions = signal<PlatformSubscription[]>([
    {
      id: 'SUB-1001',
      storeName: 'Aura Botanicals',
      ownerName: 'Sarah Skincare Merchant',
      plan: 'Growth',
      price: 29.0,
      billingCycle: 'monthly',
      status: 'active',
      startDate: ago(60),
      endDate: ago(-30),
      autoRenew: true,
    },
    {
      id: 'SUB-1002',
      storeName: 'NexTech Electronics',
      ownerName: 'Alex Tech Merchant',
      plan: 'Enterprise',
      price: 99.0,
      billingCycle: 'monthly',
      status: 'active',
      startDate: ago(90),
      endDate: ago(-15),
      autoRenew: true,
    },
    {
      id: 'SUB-1003',
      storeName: 'Angkor Silk Studio',
      ownerName: 'Vibol Chea',
      plan: 'Growth',
      price: 29.0,
      billingCycle: 'monthly',
      status: 'active',
      startDate: ago(45),
      endDate: ago(-15),
      autoRenew: true,
    },
    {
      id: 'SUB-1004',
      storeName: 'Tonle Craft Co.',
      ownerName: 'Maly Vong',
      plan: 'Free Trial',
      price: 0.0,
      billingCycle: 'trial',
      status: 'trial',
      startDate: ago(5),
      endDate: ago(-9),
      autoRenew: false,
    },
    {
      id: 'SUB-1005',
      storeName: 'Kampot Palm Goods',
      ownerName: 'Chanthy Nhem',
      plan: 'Free Trial',
      price: 0.0,
      billingCycle: 'trial',
      status: 'trial',
      startDate: ago(2),
      endDate: ago(-12),
      autoRenew: false,
    },
  ]);

  users = signal<PlatformUser[]>([
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Rentify Admin',
      email: 'admin@rentify.local',
      phone: '+85512000001',
      role: 'admin',
      status: 'active',
      isVerified: true,
      registeredAt: ago(365),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Sarah Skincare Merchant',
      email: 'merchant@rentify.local',
      phone: '+85512000002',
      role: 'user',
      status: 'active',
      isVerified: true,
      registeredAt: ago(180),
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Store Staff Member',
      email: 'staff@rentify.local',
      phone: '+85512000003',
      role: 'staff',
      status: 'active',
      isVerified: true,
      registeredAt: ago(170),
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Alex Tech Merchant',
      email: 'tech.merchant@rentify.local',
      phone: '+85512000004',
      role: 'user',
      status: 'active',
      isVerified: true,
      registeredAt: ago(120),
    },
    {
      id: '99999999-9999-4999-8999-999999999999',
      name: 'Emily Watson',
      email: 'emily.customer@example.com',
      phone: '+85512999888',
      role: 'user',
      status: 'active',
      isVerified: true,
      registeredAt: ago(150),
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      name: 'Michael Tech Customer',
      email: 'tech.customer@example.com',
      phone: '+85512999777',
      role: 'user',
      status: 'active',
      isVerified: true,
      registeredAt: ago(100),
    },
  ]);

  toastMsg = signal<string | null>(null);
  private tRef: any;

  toast(m: string) {
    this.toastMsg.set(m);
    clearTimeout(this.tRef);
    this.tRef = setTimeout(() => this.toastMsg.set(null), 2600);
  }

  private li = 100;
  log(action: string, kind = 'active') {
    this.logs.update((l) => [
      { id: 'L-' + this.li++, actor: 'Admin (Rentify)', action, kind, date: new Date().toISOString() },
      ...l,
    ]);
  }

  storeName = (id: string) => this.sellers().find((s) => s.id === id)?.store ?? '—';

  buyerStats = (name: string) => {
    const os = this.orders().filter((o) => o.buyer === name && o.status !== 'cancelled');
    return { orders: os.length, spent: os.reduce((s, o) => s + o.total, 0) };
  };

  sellerStats = (store: string) => {
    const os = this.orders().filter((o) => o.seller === store && o.status === 'completed');
    return {
      products: this.products().filter((p) => p.sellerId === this.sellers().find((s) => s.store === store)?.id)
        .length,
      orders: os.length,
      revenue: os.reduce((s, o) => s + o.total, 0),
    };
  };

  revenue = computed(() =>
    this.txs()
      .filter((t) => t.dir === 'in' && t.status === 'completed')
      .reduce((s, t) => s + t.amount, 0),
  );

  private months() {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en', { month: 'short' }),
      });
    }
    return out;
  }

  revenueSeries = computed(() =>
    this.months().map((m) => ({
      label: m.label,
      value: +this.txs()
        .filter((t) => t.dir === 'in' && t.status === 'completed' && t.date.slice(0, 7) === m.key)
        .reduce((s, t) => s + t.amount, 0)
        .toFixed(2),
    })),
  );

  ordersSeries = computed(() =>
    this.months().map((m) => ({
      label: m.label,
      value: this.orders().filter((o) => o.placedAt.slice(0, 7) === m.key).length,
    })),
  );

  // Operations
  setBuyerStatus(id: string, status: Buyer['status']) {
    this.buyers.update((l) => l.map((b) => (b.id === id ? { ...b, status } : b)));
    this.log(
      `${status === 'suspended' ? 'Suspended' : status === 'active' ? 'Activated' : 'Deactivated'} buyer ${id}`,
      status,
    );
    this.toast(`Buyer ${status}`);
  }

  approveSeller(id: string) {
    this.sellers.update((l) => l.map((s) => (s.id === id ? { ...s, status: 'active', verification: 'verified' } : s)));
    this.log(`Approved seller ${id}`, 'approved');
    this.toast('Seller approved & verified');
  }

  rejectSeller(id: string) {
    this.sellers.update((l) =>
      l.map((s) => (s.id === id ? { ...s, status: 'pending', verification: 'rejected' } : s)),
    );
    this.log(`Rejected seller application ${id}`, 'rejected');
    this.toast('Application rejected');
  }

  verifySeller(id: string) {
    this.sellers.update((l) => (l.map((s) => (s.id === id ? { ...s, verification: 'verified' } : s))));
    this.log(`Verified seller ${id}`, 'verified');
    this.toast('Seller verified');
  }

  setSellerStatus(id: string, status: Seller['status']) {
    this.sellers.update((l) => l.map((s) => (s.id === id ? { ...s, status } : s)));
    this.log(`${status === 'suspended' ? 'Suspended' : 'Reactivated'} seller ${id}`, status);
    this.toast(`Seller ${status}`);
  }

  setProductStatus(id: string, status: Product['status']) {
    this.products.update((l) => l.map((p) => (p.id === id ? { ...p, status } : p)));
    this.log(`Set product ${id} → ${status}`, status);
    this.toast(`Product ${status}`);
  }

  deleteProduct(id: string) {
    this.products.update((l) => l.filter((p) => p.id !== id));
    this.log(`Deleted product ${id}`, 'rejected');
    this.toast('Product deleted');
  }

  updateProduct(id: string, patch: Partial<Product>) {
    this.products.update((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    this.log(`Edited product ${id}`, 'active');
    this.toast('Product saved');
  }

  addCategory(name: string) {
    this.categories.update((l) => [...l, { id: 'C-' + (l.length + 1), name, status: 'active' }]);
    this.log(`Created category ${name}`, 'active');
    this.toast('Category added');
  }

  toggleCategory(id: string) {
    this.categories.update((l) =>
      l.map((c) => (c.id === id ? { ...c, status: c.status === 'active' ? 'hidden' : 'active' } : c)),
    );
    this.toast('Category updated');
  }

  setOrderStatus(id: string, status: Order['status']) {
    this.orders.update((l) => l.map((o) => (o.id === id ? { ...o, status } : o)));
    this.log(`Order ${id} → ${status}`, status);
    this.toast(`Order ${status}`);
  }

  setReviewStatus(id: string, status: Review['status']) {
    this.reviews.update((l) => l.map((r) => (r.id === id ? { ...r, status } : r)));
    this.toast(`Review ${status}`);
  }

  deleteReview(id: string) {
    this.reviews.update((l) => l.filter((r) => r.id !== id));
    this.log(`Deleted review ${id}`, 'rejected');
    this.toast('Review deleted');
  }

  refundPayment(id: string) {
    this.payments.update((l) => l.map((p) => (p.id === id ? { ...p, status: 'refunded' } : p)));
    this.log(`Refunded payment ${id}`, 'refunded');
    this.toast('Payment refunded');
  }

  completePayout(id: string) {
    this.payouts.update((l) => l.map((p) => (p.id === id ? { ...p, status: 'completed' } : p)));
    this.log(`Completed payout ${id}`, 'completed');
    this.toast('Payout completed');
  }

  setReportStatus(id: string, status: Report['status']) {
    this.reports.update((l) => l.map((r) => (r.id === id ? { ...r, status } : r)));
    this.log(`${status === 'resolved' ? 'Resolved' : 'Dismissed'} report ${id}`, status);
    this.toast(`Report ${status}`);
  }

  addReportNote(id: string, text: string) {
    this.reports.update((l) =>
      l.map((r) => (r.id === id ? { ...r, notes: [...r.notes, { text, date: new Date().toISOString() }] } : r)),
    );
    this.toast('Note added');
  }

  setComplaintStatus(id: string, status: Complaint['status']) {
    this.complaints.update((l) => l.map((c) => (c.id === id ? { ...c, status } : c)));
    this.log(`Complaint ${id} → ${status}`, status);
    this.toast(`Complaint ${status}`);
  }

  sendNotice(n: Omit<Notice, 'id' | 'date'>) {
    this.notices.update((l) => [{ ...n, id: 'N-' + (l.length + 1), date: new Date().toISOString() }, ...l]);
    this.log(`Sent notification “${n.title}”`, 'active');
    this.toast('Notification sent');
  }

  // Platform & Storefront operations
  toggleTemplateStatus(id: string) {
    this.templates.update((l) =>
      l.map((t) => (t.id === id ? { ...t, status: t.status === 'active' ? 'hidden' : 'active' } : t)),
    );
    this.toast('Template visibility updated');
  }

  addTemplate(template: Omit<WebsiteTemplate, 'id' | 'storesUsing'>) {
    const id = 'tmpl-' + Math.random().toString(36).slice(2, 9);
    this.templates.update((l) => [...l, { ...template, id, storesUsing: 0 }]);
    this.log(`Created storefront template "${template.name}"`, 'active');
    this.toast('Template created');
  }

  setWebsiteStatus(id: string, status: PlatformWebsite['status']) {
    this.websites.update((l) => l.map((w) => (w.id === id ? { ...w, status } : w)));
    this.log(`Website ${id} set to ${status}`, status);
    this.toast(`Website ${status}`);
  }

  updateWebsiteLimits(id: string, limits: Partial<PlatformWebsite['limits']>) {
    this.websites.update((l) =>
      l.map((w) => (w.id === id ? { ...w, limits: { ...w.limits, ...limits } } : w)),
    );
    this.log(`Updated limits for website ${id}`, 'active');
    this.toast('Website limits updated');
  }

  setSubscriptionStatus(id: string, status: PlatformSubscription['status']) {
    this.subscriptions.update((l) => l.map((s) => (s.id === id ? { ...s, status } : s)));
    this.log(`Subscription ${id} status set to ${status}`, status);
    this.toast(`Subscription status ${status}`);
  }

  updateSubscriptionPlan(id: string, plan: PlatformSubscription['plan'], price: number) {
    this.subscriptions.update((l) => l.map((s) => (s.id === id ? { ...s, plan, price } : s)));
    this.log(`Changed subscription ${id} to ${plan} ($${price})`, 'active');
    this.toast(`Subscription upgraded to ${plan}`);
  }

  setUserStatus(id: string, status: PlatformUser['status']) {
    this.users.update((l) => l.map((u) => (u.id === id ? { ...u, status } : u)));
    this.log(`User ${id} set to ${status}`, status);
    this.toast(`User ${status}`);
  }

  setUserRole(id: string, role: PlatformUser['role']) {
    this.users.update((l) => l.map((u) => (u.id === id ? { ...u, role } : u)));
    this.log(`User ${id} role changed to ${role}`, 'active');
    this.toast(`User role updated to ${role}`);
  }
}
