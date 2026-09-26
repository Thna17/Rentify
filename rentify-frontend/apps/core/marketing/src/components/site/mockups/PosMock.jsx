import React from 'react';
import { cn } from '@rentify/utils';

// The real Rentify POS screen (same image the homepage laptop uses) in a tablet frame
const POS_SCREEN = '/rentify/laptop-pos.png';

const PosMock = ({ className }) => (
  <div
    className={cn(
      'rounded-[28px] bg-[#1d1d1f] p-[10px] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.6)] ring-1 ring-white/10 md:rounded-[36px] md:p-[14px]',
      className
    )}
  >
    <div className="aspect-[1586/992] overflow-hidden rounded-[20px] bg-[#f5f5f7] md:rounded-[24px]">
      <img
        src={POS_SCREEN}
        alt="Rentify POS with product grid and checkout panel"
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  </div>
);

export default PosMock;
