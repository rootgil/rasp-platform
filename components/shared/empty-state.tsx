import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] mb-4">
        <Icon size={24} className="text-[#94a3b8]" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[#94a3b8] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
