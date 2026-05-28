"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type ImportResult = {
  total: number;
  specEndpoints: number;
  newShadow: number;
  cleared: number;
};

export function ImportSpecDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleOpen() {
    setFile(null);
    setError(null);
    setResult(null);
    setOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      let spec: unknown;
      try {
        spec = JSON.parse(text);
      } catch {
        setError("Could not parse file — make sure it is a valid JSON OpenAPI spec.");
        return;
      }

      const res = await fetch("/api/api-discovery/import-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }

      setResult(data as ImportResult);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <Upload className="w-4 h-4" />
        Import OpenAPI spec
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import OpenAPI spec</DialogTitle>
            <DialogDescription>
              Upload your OpenAPI 3.x spec (JSON). Discovered endpoints not present
              in the spec will be flagged as Shadow APIs.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              {/* Drop zone / file picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-sm text-text-secondary hover:border-brand hover:text-brand transition-colors"
              >
                <FileJson className="w-8 h-8" />
                {file ? (
                  <span className="font-medium text-text-primary">{file.name}</span>
                ) : (
                  <span>Click to select a <strong>.json</strong> file</span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-critical-bg border border-[#fecaca] p-3 text-sm text-critical-text">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-success-bg border border-[#bbf7d0] p-4 space-y-2">
              <div className="flex items-center gap-2 text-success-text font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Import complete
              </div>
              <ul className="text-sm text-text-secondary space-y-1 ml-7">
                <li>Spec endpoints found: <strong>{result.specEndpoints}</strong></li>
                <li>Discovered endpoints: <strong>{result.total}</strong></li>
                <li>Newly flagged as Shadow: <strong className="text-critical-text">{result.newShadow}</strong></li>
                <li>Shadow flags cleared: <strong className="text-success-text">{result.cleared}</strong></li>
              </ul>
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <DialogClose asChild>
                  <Button variant="ghost" disabled={loading}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleImport} disabled={!file || loading}>
                  {loading ? "Importing…" : "Run comparison"}
                </Button>
              </>
            ) : (
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
