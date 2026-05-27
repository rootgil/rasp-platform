import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]",
        secondary: "bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]",
        critical: "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]",
        high: "bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa]",
        medium: "bg-[#fffbeb] text-[#92400e] border border-[#fde68a]",
        low: "bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]",
        success: "bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]",
        outline: "border border-[#e2e8f0] text-[#475569]",
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
