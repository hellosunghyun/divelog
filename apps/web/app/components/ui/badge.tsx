import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils/utils"

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/12 text-primary hover:bg-primary/18",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/12 text-destructive hover:bg-destructive/18",
        outline: "border-border bg-background text-foreground hover:bg-muted/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
