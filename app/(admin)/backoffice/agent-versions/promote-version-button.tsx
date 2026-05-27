"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PromoteVersionButton({ versionId, version }: { versionId: string; version: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function promote() {
    if (!confirm(`Promote version ${version} to published? This will make it available for agent updates.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/backoffice/agent-versions/${versionId}/promote`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={promote} disabled={loading}>
      {loading ? "Promoting…" : "Promote to stable"}
    </Button>
  );
}
