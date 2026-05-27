import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-light text-low-text border border-[#bfdbfe]",
        secondary: "bg-background text-text-secondary border border-border",
        critical: "bg-critical-bg text-critical-text border border-[#fecaca]",
        high: "bg-high-bg text-high-text border border-[#fed7aa]",
        medium: "bg-medium-bg text-medium-text border border-[#fde68a]",
        low: "bg-brand-light text-low-text border border-[#bfdbfe]",
        success: "bg-success-bg text-success-text border border-[#bbf7d0]",
        outline: "border border-border text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
