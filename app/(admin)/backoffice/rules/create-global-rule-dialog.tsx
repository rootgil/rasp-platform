"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RuleYamlEditor, isRuleYamlValid } from "@/components/rules/rule-yaml-editor";
import { CUSTOM_RULE_YAML_TEMPLATE } from "@/modules/project-rules/rule-yaml-help";
import { compileRuleYaml } from "@/modules/project-rules/yaml-compiler";

export function CreateGlobalRuleDialog({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml]       = useState(CUSTOM_RULE_YAML_TEMPLATE);

  const handleOpen = useCallback((v: boolean) => {
    setOpen(v);
    if (v) setYaml(CUSTOM_RULE_YAML_TEMPLATE);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isRuleYamlValid(yaml)) {
      toast.error("Fix the YAML errors listed in the dialog before saving.");
      return;
    }

    setLoading(true);
    try {
      const compiled = compileRuleYaml(yaml);
      if ("errors" in compiled) return;

      const res = await fetch("/api/rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:           compiled.spec.id,
          type:           compiled.yaml.type,
          severity:       compiled.yaml.severity,
          description:    compiled.spec.description,
          pattern:        compiled.spec.pattern,
          target:         compiled.spec.target,
          yamlDefinition: yaml,
          enabled:        true,
        }),
      });
      if (res.ok) {
        setOpen(false);
        toast.success(`Rule "${compiled.spec.name}" created - projects will be notified`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Failed to create rule", { duration: 8000 });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>New Global Detection Rule</DialogTitle>
          <DialogDescription>
            Define the rule in YAML. It will be added to the catalogue and all existing projects will receive an opt-in notification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RuleYamlEditor yaml={yaml} onChange={setYaml} rows={8} />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isRuleYamlValid(yaml)}>
              {loading ? "Creating…" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
