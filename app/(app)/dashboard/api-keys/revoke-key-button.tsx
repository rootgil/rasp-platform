"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RevokeKeyButton({ keyId }: { keyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function revoke() {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    setLoading(true);
    try {
      await fetch(`/api/api-keys/${keyId}/revoke`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={revoke} disabled={loading}>
      {loading ? "Revoking…" : "Revoke"}
    </Button>
  );
}
