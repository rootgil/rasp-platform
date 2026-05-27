import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  delta,
  deltaPositive,
  icon: Icon,
  iconColor = "#2563eb",
  iconBg = "#eff6ff",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="flex items-start gap-4 pt-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary leading-none">
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                "mt-1 text-xs",
                deltaPositive ? "text-success" : "text-critical"
              )}
            >
              {delta}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
