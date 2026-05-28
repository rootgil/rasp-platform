"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      title={copied ? "Copied!" : "Copy ID"}
      className={`inline-flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-border-light transition-colors ${className ?? ""}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}
