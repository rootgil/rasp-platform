"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ApiDiscoveryFilters({ projects }: { projects: { id: string; name: string }[] }) {
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
