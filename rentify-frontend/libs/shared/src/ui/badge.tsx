import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@rentify/utils/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rentify-focus-ring-color)] focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",

        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",

        /** 👇 NEW: clean, reusable, theme-based */
        subtle:
          "bg-muted text-foreground border-border",

        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",

        outline:
          "bg-transparent text-foreground border-border [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",

        /* Semantic status variants backed by Rentify Design Tokens */
        success:
          "border-[var(--rentify-color-success-border)] bg-[var(--rentify-color-success-subtle)] text-[var(--rentify-color-success-text)]",

        warning:
          "border-[var(--rentify-color-warning-border)] bg-[var(--rentify-color-warning-subtle)] text-[var(--rentify-color-warning-text)]",

        danger:
          "border-[var(--rentify-color-danger-border)] bg-[var(--rentify-color-danger-subtle)] text-[var(--rentify-color-danger-text)]",

        info:
          "border-[var(--rentify-color-info-border)] bg-[var(--rentify-color-info-subtle)] text-[var(--rentify-color-info-text)]",

        /** 👇 ROLE VARIANTS (theme-driven, clean) */
        admin:
          "bg-primary/10 text-primary border-primary/20",

        customer:
          "bg-muted text-foreground border-border",

        merchant:
          "bg-secondary/10 text-secondary border-secondary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)


function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
