"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/api-discovery/export", { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rasp-api-inventory.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={handleExport} disabled={loading}>
      <Download className="w-4 h-4" />
      {loading ? "Exporting…" : "Export OpenAPI spec"}
    </Button>
  );
}
