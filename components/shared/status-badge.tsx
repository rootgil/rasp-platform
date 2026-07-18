import { cn } from "@/lib/utils";

const config: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  online:        { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  healthy:       { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  active:        { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  resolved:      { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  offline:       { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" },
  disconnected:  { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" },
  degraded:      { text: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  missing:       { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  optional:      { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" },
  error:         { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  block:         { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  blocked:       { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  outdated:      { text: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  investigating: { text: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  open:          { text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb" },
  monitor:       { text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb" },
  candidate:     { text: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  published:     { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  deprecated:    { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" },
  halted:        { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  quarantined:   { text: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff", dot: "#9333ea" },
  pending:       { text: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  approved:      { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  rejected:      { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  executed:      { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" },
};

const fallback = { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" };

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toLowerCase();
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
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}
