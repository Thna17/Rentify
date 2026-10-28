import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@rentify/utils/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: "bg-[var(--rentify-color-brand-primary)] text-[var(--rentify-color-text-inverse)] hover:bg-[var(--rentify-color-brand-primary-hover)] active:bg-[var(--rentify-color-brand-primary-active)]",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        danger: "bg-[var(--rentify-color-danger-base)] text-[var(--rentify-color-text-inverse)] hover:opacity-90",
        accent: "bg-[var(--rentify-color-brand-accent)] text-[var(--rentify-color-text-on-accent)] hover:opacity-90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-[52px] rounded-md px-6 has-[>svg]:px-4",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean; iconLeft?: React.ReactNode; iconRight?: React.ReactNode }

const Button = React.forwardRef<
  React.ElementRef<"button">,
  ButtonProps
>(({ className, variant, size, asChild = false, loading = false, iconLeft, iconRight, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >{/* Slot (asChild) accepts exactly one child, so icons only wrap a real <button> */}
      {asChild ? children : <>{loading ? <span role="status" aria-label="Loading" className="size-4 rounded-full border-2 border-current border-t-transparent" /> : iconLeft}{children}{iconRight}</>}</Comp>
  )
})

Button.displayName = "Button"

export { Button, buttonVariants }
