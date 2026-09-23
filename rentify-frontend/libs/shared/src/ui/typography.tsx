import { cn } from '@rentify/utils/utils';
import React from 'react';

type TypographyVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'p' 
  | 'blockquote' 
  | 'table' 
  | 'list' 
  | 'inline-code' 
  | 'lead' 
  | 'large' 
  | 'small' 
  | 'muted';

interface TypographyProps {
  variant: TypographyVariant;
  children: React.ReactNode;
  className?: string;
  // Optional props for specific variants
  asChild?: boolean;
}

const variantStyles: Record<TypographyVariant, string> = {
  h1: 'scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance',
  h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
  h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
  h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
  p: 'leading-7 [&:not(:first-child)]:mt-6',
  blockquote: 'mt-6 border-l-2 pl-6 italic',
  table: 'my-6 w-full overflow-y-auto',
  list: 'my-6 ml-6 list-disc [&>li]:mt-2',
  'inline-code': 'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
  lead: 'text-muted-foreground text-xl',
  large: 'text-lg font-semibold',
  small: 'text-sm leading-none font-medium',
  muted: 'text-muted-foreground text-sm'
};

const variantElements: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  p: 'p',
  blockquote: 'blockquote',
  table: 'div',
  list: 'ul',
  'inline-code': 'code',
  lead: 'p',
  large: 'div',
  small: 'small',
  muted: 'p'
};

export function Typography({ variant, children, className, asChild = false, ...props }: TypographyProps) {
  const Element = variantElements[variant];
  const baseClassName = variantStyles[variant];

  // Handle special cases that need nested structure
  if (variant === 'table') {
    return (
      <div className={cn(baseClassName, className)} {...props}>
        <table className="w-full">
          {children}
        </table>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <ul className={cn(baseClassName, className)} {...props}>
        {children}
      </ul>
    );
  }

  if (variant === 'inline-code') {
    return (
      <code className={cn(baseClassName, className)} {...props}>
        {children}
      </code>
    );
  }

  // For all other variants
  return React.createElement(
    Element,
    {
      className: cn(baseClassName, className),
      ...props
    },
    children
  );
}

// Optional: Export individual components for backward compatibility
export function TypographyH1({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="h1" className={className} {...props} />;
}

export function TypographyH2({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="h2" className={className} {...props} />;
}

export function TypographyH3({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="h3" className={className} {...props} />;
}

export function TypographyH4({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="h4" className={className} {...props} />;
}

export function TypographyP({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="p" className={className} {...props} />;
}

export function TypographyBlockquote({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="blockquote" className={className} {...props} />;
}

export function TypographyTable({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="table" className={className} {...props} />;
}

export function TypographyList({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="list" className={className} {...props} />;
}

export function TypographyInlineCode({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="inline-code" className={className} {...props} />;
}

export function TypographyLead({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="lead" className={className} {...props} />;
}

export function TypographyLarge({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="large" className={className} {...props} />;
}

export function TypographySmall({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="small" className={className} {...props} />;
}

export function TypographyMuted({ className, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="muted" className={className} {...props} />;
}
