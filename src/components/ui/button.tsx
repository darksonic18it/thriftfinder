import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--button-ring-offset)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Token-driven so the dark theme turns this into white-on-#02000D. */
        default:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow hover:bg-[var(--button-primary-bg-hover)]",
        /* Semantic destructive red — intentionally theme-independent. */
        destructive:
          "bg-red-500 text-slate-50 shadow-sm hover:bg-red-500/90",
        outline:
          "border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-bg-tertiary)]",
        secondary:
          "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-bg-tertiary)]",
        ghost: "hover:bg-[var(--button-ghost-bg-hover)] hover:text-[var(--button-ghost-fg)]",
        link: "text-[var(--button-link-fg)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
