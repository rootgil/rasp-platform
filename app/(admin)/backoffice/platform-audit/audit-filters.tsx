"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuditFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["action", "target", "actor", "org"] as const) {
      const v = (data.get(key) as string | null)?.trim();
      if (v) params.set(key, v);
    }
    router.push(`?${params.toString()}`);
  }

  function handleClear() {
    formRef.current?.reset();
    router.push("?");
  }

  const hasFilters = ["action", "target", "actor", "org"].some((k) => sp.has(k));

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="action"
        placeholder="Action"
        defaultValue={sp.get("action") ?? ""}
        className="w-[180px] h-8 text-xs"
      />
      <Input
        name="target"
        placeholder="Target"
        defaultValue={sp.get("target") ?? ""}
        className="w-[180px] h-8 text-xs"
      />
      <Input
        name="actor"
        placeholder="Actor (name or email)"
        defaultValue={sp.get("actor") ?? ""}
        className="w-[200px] h-8 text-xs"
      />
      <Input
        name="org"
        placeholder="Organization"
        defaultValue={sp.get("org") ?? ""}
        className="w-[160px] h-8 text-xs"
      />
      <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
        Filter
      </Button>
      {hasFilters && (
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClear}>
          Clear
        </Button>
      )}
    </form>
  );
}
