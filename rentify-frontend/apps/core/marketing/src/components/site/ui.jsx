import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@rentify/utils';

// Design tokens for the marketing site, kept in one place
export const INK = 'text-[#1d1d1f]';
export const MUTED = 'text-[#6e6e73]';

export const Container = ({ className, children }) => (
  <div className={cn('mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8', className)}>
    {children}
  </div>
);

const SECTION_TONES = {
  white: 'bg-white text-[#1d1d1f]',
  gray: 'bg-[#f5f5f7] text-[#1d1d1f]',
  dark: 'bg-black text-[#f5f5f7]',
};

export const Section = ({ id, tone = 'white', className, children }) => (
  <section
    id={id}
    className={cn(
      'relative scroll-mt-14 overflow-clip py-24 md:py-36 2xl:py-44',
      SECTION_TONES[tone],
      className
    )}
  >
    {children}
  </section>
);

export const Eyebrow = ({ className, children }) => (
  <p
    className={cn(
      'text-[17px] font-semibold tracking-tight text-[#0071e3] md:text-[21px] 2xl:text-[24px]',
      className
    )}
  >
    {children}
  </p>
);

const HEADING_SIZES = {
  display:
    'text-[44px] leading-[1.04] tracking-[-0.035em] sm:text-6xl md:text-7xl lg:text-[88px] 2xl:text-[112px]',
  xl: 'text-[40px] leading-[1.06] tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-[72px] 2xl:text-[88px]',
  lg: 'text-[32px] leading-[1.1] tracking-[-0.025em] sm:text-4xl md:text-5xl 2xl:text-[64px]',
  md: 'text-2xl leading-[1.15] tracking-[-0.02em] md:text-[32px]',
  sm: 'text-xl leading-snug tracking-[-0.01em] md:text-2xl',
};

export const Heading = ({ as: Tag = 'h2', size = 'lg', className, children }) => (
  <Tag
    className={cn(
      'whitespace-pre-line font-semibold',
      HEADING_SIZES[size],
      className
    )}
  >
    {children}
  </Tag>
);

export const Lead = ({ className, children }) => (
  <p
    className={cn(
      'text-[19px] leading-[1.45] text-[#6e6e73] md:text-[21px] 2xl:text-[24px]',
      className
    )}
  >
    {children}
  </p>
);

const BUTTON_VARIANTS = {
  primary: 'bg-[#0071e3] text-white hover:bg-[#0077ed]',
  dark: 'bg-[#1d1d1f] text-white hover:bg-black',
  light: 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
  outline:
    'border border-[#1d1d1f]/15 bg-transparent text-[#1d1d1f] hover:border-[#1d1d1f]/30',
  outlineLight:
    'border border-white/30 bg-transparent text-white hover:border-white/60',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-4 text-[13px]',
  md: 'h-11 px-6 text-[15px]',
  lg: 'h-12 px-7 text-[17px]',
};

const isExternal = (href) => /^https?:\/\//.test(href || '');

// Renders a router Link for internal paths and an anchor for external ones
export const SmartLink = ({ to, className, children, ...props }) => {
  if (isExternal(to) || to?.startsWith('mailto:') || to?.startsWith('tel:')) {
    return (
      <a
        href={to}
        className={className}
        {...(isExternal(to) ? { target: '_blank', rel: 'noreferrer' } : {})}
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className} {...props}>
      {children}
    </Link>
  );
};

export const ButtonLink = ({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => (
  <SmartLink
    to={to}
    className={cn(
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-all duration-300 active:scale-[0.98]',
      BUTTON_VARIANTS[variant],
      BUTTON_SIZES[size],
      className
    )}
    {...props}
  >
    {children}
  </SmartLink>
);

export const ChevronLink = ({ to, tone = 'blue', className, children }) => {
  const external = isExternal(to);
  const Icon = external ? ArrowUpRight : ChevronRight;

  return (
    <SmartLink
      to={to}
      className={cn(
        'group inline-flex items-center gap-0.5 text-[17px] font-normal hover:underline md:text-[19px]',
        tone === 'blue' && 'text-[#0066cc]',
        tone === 'light' && 'text-[#2997ff]',
        className
      )}
    >
      {children}
      <Icon className="h-[1em] w-[1em] transition-transform duration-300 group-hover:translate-x-0.5" />
    </SmartLink>
  );
};

// A rounded surface used for bento tiles and feature cards
export const Tile = ({ tone = 'gray', className, children }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-[28px]',
      tone === 'gray' && 'bg-[#f5f5f7]',
      tone === 'white' && 'bg-white',
      tone === 'dark' && 'bg-[#1d1d1f] text-[#f5f5f7]',
      className
    )}
  >
    {children}
  </div>
);
