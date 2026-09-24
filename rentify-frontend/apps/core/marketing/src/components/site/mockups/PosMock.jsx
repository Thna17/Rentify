import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@rentify/utils';
import { EASE } from '../motion';

// Illustrative café menu for the point-of-sale mockup
const MENU = [
  { name: 'Iced Latte', price: '$2.50', color: 'from-[#e9d8c4] to-[#c9a57f]' },
  { name: 'Cappuccino', price: '$2.25', color: 'from-[#f1e4d3] to-[#d8b48b]' },
  { name: 'Matcha Latte', price: '$2.75', color: 'from-[#dcebc9] to-[#9cc27a]' },
  { name: 'Croissant', price: '$1.80', color: 'from-[#f7e3b5] to-[#e3b45d]' },
  { name: 'Mango Smoothie', price: '$3.00', color: 'from-[#ffe2a8] to-[#ffb13d]' },
  { name: 'Espresso', price: '$1.50', color: 'from-[#d9c7b8] to-[#7d5a44]' },
];

const CART = [
  ['Iced Latte × 2', '$5.00'],
  ['Croissant × 1', '$1.80'],
  ['Mango Smoothie × 1', '$3.00'],
];

// A tablet-sized point-of-sale screen: menu on the left, current sale on the right
const PosMock = ({ className }) => (
  <div
    className={cn(
      'rounded-[28px] bg-[#1d1d1f] p-[10px] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.6)] ring-1 ring-white/10 md:rounded-[36px] md:p-[14px]',
      className
    )}
    style={{ containerType: 'inline-size' }}
  >
    <div className="grid aspect-[4/3] grid-cols-[1.55fr_1fr] overflow-hidden rounded-[20px] bg-[#f5f5f7] md:rounded-[24px]">
      <div className="flex flex-col p-[4%]">
        <div className="flex items-center justify-between">
          <p className="text-[length:max(10px,1.9cqw)] font-semibold text-[#1d1d1f]">Menu</p>
          <div className="flex gap-1">
            {['All', 'Coffee', 'Bakery'].map((tab, i) => (
              <span
                key={tab}
                className={cn(
                  'rounded-full px-[0.7em] py-[0.2em] text-[length:max(7px,1.25cqw)]',
                  i === 0 ? 'bg-[#1d1d1f] text-white' : 'bg-white text-[#6e6e73]'
                )}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-[4%] grid flex-1 grid-cols-3 gap-[3%]">
          {MENU.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: EASE, delay: index * 0.06 }}
              className="flex flex-col overflow-hidden rounded-[12px] bg-white"
            >
              <div className={cn('flex-1 bg-gradient-to-br', item.color)} />
              <div className="px-[8%] py-[6%]">
                <p className="truncate text-[length:max(7px,1.35cqw)] font-medium text-[#1d1d1f]">
                  {item.name}
                </p>
                <p className="text-[length:max(7px,1.25cqw)] text-[#86868b]">{item.price}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex flex-col border-l border-black/5 bg-white p-[6%]">
        <p className="text-[length:max(10px,1.9cqw)] font-semibold text-[#1d1d1f]">Current sale</p>
        <div className="mt-[8%] space-y-[6%]">
          {CART.map(([item, price]) => (
            <div
              key={item}
              className="flex justify-between gap-2 text-[length:max(7px,1.35cqw)] text-[#424245]"
            >
              <span className="truncate">{item}</span>
              <span>{price}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto space-y-[6%]">
          <div className="flex justify-between border-t border-black/10 pt-[6%] text-[length:max(9px,1.7cqw)] font-semibold text-[#1d1d1f]">
            <span>Total</span>
            <span>$9.80</span>
          </div>
          <div className="grid grid-cols-2 gap-[6%] text-[length:max(7px,1.25cqw)]">
            <span className="rounded-full bg-[#fde8e9] py-[0.4em] text-center font-medium text-[#E1232E]">
              KHQR
            </span>
            <span className="rounded-full bg-[#f0f0f2] py-[0.4em] text-center text-[#6e6e73]">
              Cash
            </span>
          </div>
          <div className="rounded-full bg-[#0071e3] py-[0.7em] text-center text-[length:max(8px,1.55cqw)] font-medium text-white">
            Charge $9.80
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PosMock;
