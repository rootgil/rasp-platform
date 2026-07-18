"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export function SecretField({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1.5 max-w-[280px]">
      <span
        className={`font-mono text-xs text-text-primary ${revealed ? "break-all text-right" : "tracking-widest"}`}
        title={revealed ? value : undefined}
      >
        {revealed ? value : "••••••••••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        title={revealed ? "Masquer" : "Afficher"}
        className="inline-flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-border-light transition-colors shrink-0"
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copié !" : "Copier"}
        className="inline-flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-border-light transition-colors shrink-0"
      >
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
