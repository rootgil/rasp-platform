"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

export function EditNameForm({
  initialName,
  label,
  endpoint,
  fieldKey,
  onSaved,
}: {
  initialName: string;
  label: string;
  endpoint: string;
  fieldKey: string;
  onSaved?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (value.trim() === initialName) { setEditing(false); return; }
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldKey]: value.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Failed to save");
      } else {
        toast.success(`${label} updated`);
        onSaved?.(value.trim());
        setEditing(false);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">{value}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-text-muted hover:text-text-secondary transition-colors"
          title={`Edit ${label.toLowerCase()}`}
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="h-7 text-sm py-0 px-2"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setValue(initialName); setEditing(false); }
        }}
      />
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={loading} onClick={handleSave}>
        {loading ? "…" : "Save"}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setValue(initialName); setEditing(false); }}>
        Cancel
      </Button>
    </div>
  );
}

export { Label };
