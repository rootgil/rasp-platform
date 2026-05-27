import { cn } from "@/lib/utils";

type Severity = "critical" | "high" | "medium" | "low" | string;

const config: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  critical: { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  high:     { text: "#9a3412", bg: "#fff7ed", border: "#fed7aa", dot: "#ea580c" },
  medium:   { text: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  low:      { text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb" },
  safe:     { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  resolved: { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
};

const fallback = { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" };

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const key = severity.toLowerCase();
  const c = config[key] ?? fallback;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
        className
      )}
      style={{ color: c.text, backgroundColor: c.bg, borderColor: c.border }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.dot }}
      />
      {severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()}
    </span>
  );
}
