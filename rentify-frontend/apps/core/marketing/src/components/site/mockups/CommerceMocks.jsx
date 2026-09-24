import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, ImagePlus, Ribbon, Send, Shirt, ShoppingBag } from 'lucide-react';
import { cn } from '@rentify/utils';
import { EASE } from '../motion';

// Illustrative sample data used by the product mockups
const ORDERS = [
  { id: '1048', name: 'Sokha Chan', amount: '$38.00', status: 'Paid' },
  { id: '1047', name: 'Dara Kim', amount: '$24.00', status: 'Packing' },
  { id: '1046', name: 'Sreyneang Oum', amount: '$52.50', status: 'Delivered' },
  { id: '1045', name: 'Vannak Heng', amount: '$19.90', status: 'Paid' },
  { id: '1044', name: 'Malis Sok', amount: '$64.00', status: 'Delivered' },
];

const STATUS_STYLES = {
  Paid: 'bg-[#e3f5e8] text-[#1a7f37]',
  Packing: 'bg-[#fff4d6] text-[#9a6700]',
  Delivered: 'bg-[#f0f0f2] text-[#6e6e73]',
};

const initials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('');

const useLoop = (length, interval, active = true) => {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !active) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), interval);
    return () => clearInterval(timer);
  }, [length, interval, reduce, active]);

  return index;
};

// Order list where a new order slides in at the top every few seconds
export const OrdersList = ({ className }) => {
  const ref = React.useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const offset = useLoop(ORDERS.length, 2800, inView);
  const visible = [0, 1, 2, 3].map((i) => ORDERS[(i + ORDERS.length - offset) % ORDERS.length]);

  return (
    <div
      ref={ref}
      className={cn(
        'w-full max-w-[340px] rounded-[20px] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] ring-1 ring-black/5',
        className
      )}
    >
      <AnimatePresence initial={false}>
        {visible.map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f2] text-[11px] font-semibold text-[#1d1d1f]">
              {initials(order.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{order.name}</p>
              <p className="text-[11px] text-[#86868b]">#{order.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-[#1d1d1f]">{order.amount}</p>
              <span
                className={cn(
                  'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                  STATUS_STYLES[order.status]
                )}
              >
                {order.status}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const WEEK = [
  { day: 'M', value: 42 },
  { day: 'T', value: 58 },
  { day: 'W', value: 49 },
  { day: 'T', value: 71 },
  { day: 'F', value: 66 },
  { day: 'S', value: 92 },
  { day: 'S', value: 84 },
];

// Weekly sales bars that grow when scrolled into view
export const SalesChart = ({ className, tone = 'light' }) => {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const dark = tone === 'dark';

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <p className={cn('text-[12px]', dark ? 'text-white/60' : 'text-[#86868b]')}>This week</p>
      <p
        className={cn(
          'text-[28px] font-semibold tracking-tight',
          dark ? 'text-white' : 'text-[#1d1d1f]'
        )}
      >
        $1,284.50
      </p>
      <div className="mt-4 flex h-28 items-end gap-2">
        {WEEK.map((item, index) => (
          <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <motion.div
              className={cn(
                'w-full rounded-md',
                index === 5 ? 'bg-[#0071e3]' : dark ? 'bg-white/20' : 'bg-[#d2d2d7]'
              )}
              initial={{ height: 4 }}
              animate={{ height: inView ? `${item.value}%` : 4 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.1 + index * 0.06 }}
            />
            <span className={cn('text-[10px]', dark ? 'text-white/50' : 'text-[#86868b]')}>
              {item.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// A printed-style invoice with line items and totals
export const InvoiceCard = ({ className }) => (
  <div
    className={cn(
      'w-full max-w-[300px] rounded-[18px] bg-white p-5 text-left shadow-[0_24px_60px_-24px_rgba(0,0,0,0.3)] ring-1 ring-black/5',
      className
    )}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[15px] font-semibold text-[#1d1d1f]">Invoice</p>
        <p className="text-[11px] text-[#86868b]">INV-0142 · Sokha Chan</p>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-[#e3f5e8] px-2 py-0.5 text-[10px] font-medium text-[#1a7f37]">
        <Check className="h-3 w-3" /> Paid
      </span>
    </div>
    <div className="mt-4 space-y-2 text-[12px]">
      {[
        ['Gentle Foaming Cleanser × 1', '$24.00'],
        ['Hydrating Serum × 1', '$18.00'],
      ].map(([item, price]) => (
        <div key={item} className="flex justify-between text-[#424245]">
          <span>{item}</span>
          <span>{price}</span>
        </div>
      ))}
    </div>
    <div className="mt-3 space-y-1.5 border-t border-black/10 pt-3 text-[12px] text-[#6e6e73]">
      <div className="flex justify-between">
        <span>Discount</span>
        <span>−$4.00</span>
      </div>
      <div className="flex justify-between">
        <span>Tax</span>
        <span>$0.00</span>
      </div>
      <div className="flex justify-between pt-1 text-[14px] font-semibold text-[#1d1d1f]">
        <span>Total</span>
        <span>$38.00</span>
      </div>
    </div>
  </div>
);

const ALERTS = [
  { id: '1048', text: 'New order #1048 · $38.00', detail: 'Sokha Chan · paid with KHQR' },
  { id: '1047', text: 'New order #1047 · $24.00', detail: 'Dara Kim · 2 items' },
  { id: '1046', text: 'New order #1046 · $52.50', detail: 'Sreyneang Oum · paid with KHQR' },
];

// Stacked Telegram notifications for incoming orders
export const TelegramStack = ({ className }) => (
  <div className={cn('relative w-full max-w-[320px]', className)}>
    {ALERTS.map((alert, index) => (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        whileInView={{ opacity: 1 - index * 0.3, y: 0, scale: 1 - index * 0.05 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, ease: EASE, delay: (ALERTS.length - index) * 0.15 }}
        className={cn(
          'flex items-start gap-3 rounded-[18px] bg-white p-3.5 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.3)] ring-1 ring-black/5',
          index === 0 ? 'relative' : 'absolute inset-x-0 top-0'
        )}
        style={{
          zIndex: ALERTS.length - index,
          marginTop: index > 0 ? `${index * 12}px` : undefined,
        }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#2AABEE]">
          <Send className="-ml-0.5 h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#1d1d1f]">Rentify Orders</p>
            <span className="text-[10px] text-[#86868b]">now</span>
          </div>
          <p className="truncate text-[12px] text-[#1d1d1f]">{alert.text}</p>
          <p className="truncate text-[11px] text-[#86868b]">{alert.detail}</p>
        </div>
      </motion.div>
    ))}
  </div>
);

const STAFF = [
  { name: 'Srey Pov', role: 'Owner', color: 'bg-[#1d1d1f] text-white' },
  { name: 'Rithy Nov', role: 'Manager', color: 'bg-[#e8f1fd] text-[#0066cc]' },
  { name: 'Kanha Lim', role: 'Cashier', color: 'bg-[#f0f0f2] text-[#424245]' },
];

// Team members with their roles
export const StaffCard = ({ className }) => (
  <div
    className={cn(
      'w-full max-w-[320px] space-y-1 rounded-[20px] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] ring-1 ring-black/5',
      className
    )}
  >
    {STAFF.map((person) => (
      <div key={person.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#d2d2d7] to-[#f5f5f7] text-[11px] font-semibold text-[#1d1d1f]">
          {initials(person.name)}
        </span>
        <p className="flex-1 text-[13px] font-medium text-[#1d1d1f]">{person.name}</p>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', person.color)}>
          {person.role}
        </span>
      </div>
    ))}
  </div>
);

// Phone screen: adding a product
export const ProductFormScreen = () => (
  <div className="flex h-full flex-col bg-[#f5f5f7] px-[7%] pb-[11%] pt-[3%] text-left">
    <p className="text-[length:5cqw] font-semibold text-[#1d1d1f]">New product</p>
    <div className="mt-[6%] flex aspect-[4/3] items-center justify-center rounded-[14px] bg-gradient-to-br from-[#e8e3f7] to-[#f6f3ff]">
      <ImagePlus className="h-[18%] w-[18%] text-[#6e5bb8]" strokeWidth={1.5} />
    </div>
    <div className="mt-[6%] space-y-[4%]">
      {[
        ['Name', 'Gentle Foaming Cleanser'],
        ['Price', '$24.00'],
        ['Stock', '36'],
        ['Category', 'Cleansers & Toners'],
      ].map(([label, value]) => (
        <div key={label} className="rounded-[10px] bg-white px-[6%] py-[3.5%]">
          <p className="text-[length:3.2cqw] text-[#86868b]">{label}</p>
          <p className="truncate text-[length:4.2cqw] text-[#1d1d1f]">{value}</p>
        </div>
      ))}
    </div>
    <div className="mt-auto rounded-full bg-[#0071e3] py-[4%] text-center text-[length:4.2cqw] font-medium text-white">
      Publish
    </div>
  </div>
);

// Phone screen: KHQR payment at checkout
export const CheckoutScreen = ({ children }) => (
  <div className="flex h-full flex-col items-center justify-center bg-[#f5f5f7] px-[8%] pb-[8%]">
    {children}
    <div className="mt-[8%] flex items-center gap-1.5 rounded-full bg-[#e3f5e8] px-[6%] py-[3%] text-[length:4cqw] font-medium text-[#1a7f37]">
      <Check className="h-[1.1em] w-[1.1em]" /> Payment received
    </div>
  </div>
);

// Phone screen: today's sales overview
export const DashboardScreen = () => {
  const ref = React.useRef(null);
  const inView = useInView(ref, { amount: 0.5 });

  return (
    <div ref={ref} className="flex h-full flex-col bg-[#f5f5f7] px-[7%] pb-[11%] pt-[3%] text-left">
      <p className="text-[length:3.6cqw] text-[#86868b]">Today</p>
      <p className="text-[length:8.5cqw] font-semibold tracking-tight text-[#1d1d1f]">$412.50</p>
      <div className="mt-[5%] rounded-[14px] bg-white p-[6%]">
        <svg viewBox="0 0 200 70" className="w-full">
          <defs>
            <linearGradient id="dash-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0071e3" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,58 C20,52 30,40 50,44 C70,48 80,26 100,30 C120,34 130,18 150,20 C170,22 180,8 200,6 L200,70 L0,70 Z"
            fill="url(#dash-fill)"
          />
          <motion.path
            d="M0,58 C20,52 30,40 50,44 C70,48 80,26 100,30 C120,34 130,18 150,20 C170,22 180,8 200,6"
            fill="none"
            stroke="#0071e3"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: inView ? 1 : 0 }}
            transition={{ duration: 1.6, ease: EASE }}
          />
        </svg>
      </div>
      <div className="mt-[5%] grid grid-cols-2 gap-[5%]">
        {[
          ['Orders', '18'],
          ['Visitors', '342'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[12px] bg-white p-[10%]">
            <p className="text-[length:3.2cqw] text-[#86868b]">{label}</p>
            <p className="text-[length:6cqw] font-semibold text-[#1d1d1f]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-[5%] space-y-[3%] rounded-[14px] bg-white p-[6%]">
        <p className="text-[length:3.2cqw] text-[#86868b]">Top products</p>
        {['Gentle Foaming Cleanser', 'Hydrating Serum', 'Daily Moisturizer'].map((item, i) => (
          <div key={item} className="flex items-center justify-between text-[length:3.6cqw]">
            <span className="truncate text-[#1d1d1f]">{item}</span>
            <span className="text-[#86868b]">{[24, 17, 11][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CATALOG = [
  { name: 'Linen Shirt', price: '$18.00', was: '$22.00', tone: 'from-[#efe7dc] to-[#d9c8b1]', icon: Shirt },
  { name: 'Silk Scarf', price: '$12.00', tone: 'from-[#f3dfe3] to-[#d9a3ae]', icon: Ribbon },
  { name: 'Cotton Tee', price: '$14.00', tone: 'from-[#dde6ee] to-[#9fb4c7]', icon: Shirt },
  { name: 'Canvas Tote', price: '$9.50', tone: 'from-[#ece9df] to-[#bdb49c]', icon: ShoppingBag },
];

// A clean product grid, the way a boutique storefront presents its catalog
export const CatalogMock = ({ className }) => (
  <div
    className={cn(
      'w-full max-w-[460px] rounded-[24px] bg-white p-5 text-left shadow-[0_40px_90px_-40px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]',
      className
    )}
  >
    <div className="flex items-center justify-between">
      <p className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">Kanha Studio</p>
      <div className="flex gap-3 text-[11px] text-[#6e6e73]">
        <span>New</span>
        <span>Women</span>
        <span>Accessories</span>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      {CATALOG.map((item, index) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: EASE, delay: index * 0.08 }}
        >
          <div
            className={cn(
              'flex aspect-[4/5] items-center justify-center rounded-[14px] bg-gradient-to-br',
              item.tone
            )}
          >
            <item.icon className="h-[38%] w-[38%] text-white/80" strokeWidth={0.9} />
          </div>
          <p className="mt-2 text-[12px] font-medium text-[#1d1d1f]">{item.name}</p>
          <p className="text-[11px] text-[#6e6e73]">
            {item.price}
            {item.was && <span className="ml-1.5 text-[#aeaeb2] line-through">{item.was}</span>}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
);
