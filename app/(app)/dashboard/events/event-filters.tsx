"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEVERITIES = ["critical", "high", "medium", "low"];
const ATTACK_TYPES = [
  "sql_injection", "path_traversal", "command_injection",
  "xss", "ssrf", "deserialization", "suspicious_payload",
];

export function EventFilters({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value === "all" || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={sp.get("severity") ?? "all"} onValueChange={(v) => update("severity", v)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          {SEVERITIES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sp.get("type") ?? "all"} onValueChange={(v) => update("type", v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Attack type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ATTACK_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sp.get("projectId") ?? "all"} onValueChange={(v) => update("projectId", v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Application" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All applications</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
