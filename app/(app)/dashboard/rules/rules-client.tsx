"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown, ChevronUp, Plus, UploadCloud, Pencil, Trash2, AlertCircle, CheckCircle2,
} from "lucide-react";

interface Project     { id: string; name: string }
interface CatalogueRule {
  id: string; name: string; type: string; severity: string;
  description: string | null; yamlDefinition: string | null;
}
interface ProjectRule {
  id: string; name: string; type: string; severity: string;
  description: string | null; enabled: boolean; source: string;
  yamlDefinition: string; pattern: string | null; target: string;
  catalogueRuleId: string | null;
  catalogueRule: { name: string; yamlDefinition: string | null } | null;
}

const SEV: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive", high: "destructive", medium: "secondary", low: "outline",
};

const CUSTOM_TEMPLATE = `name: My Detection Rule
type: custom_rule
severity: medium
target: any
pattern: "(keyword1|keyword2)"
description: Describe what this rule detects
enabled: true`;

function YamlValidation({ yaml }: { yaml: string }) {
  const lines  = yaml.split("\n");
  const obj: Record<string, string> = {};
  for (const l of lines) { const m = l.match(/^(\w+):\s*"?([^"#\n]*)"?\s*/); if (m) obj[m[1]] = m[2].trim(); }
  const missing = ["id", "name", "type", "severity", "target", "pattern"].filter((k) => !obj[k]);
  if (missing.length) return (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle size={11} /> Missing: {missing.join(", ")}
    </span>
  );
  try { new RegExp(obj.pattern); } catch {
    return <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle size={11} /> invalid regex pattern</span>;
  }
  return <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 size={11} /> Valid</span>;
}

export function RulesClient({
  projects,
  catalogueRules,
}: {
  projects:      Project[];
  catalogueRules: CatalogueRule[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [projectRules, setProjectRules]           = useState<ProjectRule[]>([]);
  const [loadingRules, setLoadingRules]           = useState(false);
  const [publishing, setPublishing]               = useState(false);
  const [dirty, setDirty]                         = useState(false);

  // Expanded YAML panels
  const [expandedCatalogueYaml, setExpandedCatalogueYaml] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget]               = useState<string | null>(null);
  const [overrideYaml, setOverrideYaml]                   = useState("");

  // Custom rule dialog
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editTarget, setEditTarget]             = useState<ProjectRule | null>(null);
  const [customYaml, setCustomYaml]             = useState(CUSTOM_TEMPLATE);

  const fetchProjectRules = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingRules(true);
    try {
      const res = await fetch(`/api/project-rules?projectId=${projectId}`);
      if (res.ok) setProjectRules(await res.json());
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => { fetchProjectRules(selectedProjectId); }, [selectedProjectId, fetchProjectRules]);

  // ——— Catalogue tab actions ———

  function isActive(catalogueRuleId: string) {
    return projectRules.some((pr) => pr.catalogueRuleId === catalogueRuleId);
  }

  function getProjectRule(catalogueRuleId: string) {
    return projectRules.find((pr) => pr.catalogueRuleId === catalogueRuleId);
  }

  async function toggleCatalogueRule(rule: CatalogueRule) {
    const existing = getProjectRule(rule.id);
    if (existing) {
      const res = await fetch(`/api/project-rules/${existing.id}`, { method: "DELETE" });
      if (res.ok) { setProjectRules((p) => p.filter((r) => r.id !== existing.id)); setDirty(true); }
      else toast.error("Failed to deactivate rule");
    } else {
      const res = await fetch("/api/project-rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ source: "catalogue", projectId: selectedProjectId, catalogueRuleId: rule.id }),
      });
      if (res.ok) { const pr = await res.json() as ProjectRule; setProjectRules((p) => [...p, pr]); setDirty(true); }
      else toast.error("Failed to activate rule");
    }
  }

  async function saveOverride() {
    if (!overrideTarget) return;
    const pr = getProjectRule(overrideTarget);
    if (!pr) return;
    const res = await fetch(`/api/project-rules/${pr.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ yamlDefinition: overrideYaml }),
    });
    if (res.ok) {
      const updated: ProjectRule = await res.json();
      setProjectRules((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      setOverrideTarget(null);
      setDirty(true);
      toast.success("Override saved");
    } else {
      toast.error("Failed to save override");
    }
  }

  // ——— Custom tab actions ———

  function openCreateDialog() {
    setEditTarget(null);
    setCustomYaml(CUSTOM_TEMPLATE);
    setCustomDialogOpen(true);
  }

  function openEditDialog(pr: ProjectRule) {
    setEditTarget(pr);
    setCustomYaml(pr.yamlDefinition);
    setCustomDialogOpen(true);
  }

  async function saveCustomRule() {
    if (editTarget) {
      const res = await fetch(`/api/project-rules/${editTarget.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ yamlDefinition: customYaml }),
      });
      if (res.ok) {
        const updated: ProjectRule = await res.json();
        setProjectRules((p) => p.map((r) => (r.id === updated.id ? updated : r)));
        setCustomDialogOpen(false);
        setDirty(true);
        toast.success("Rule updated");
      } else { toast.error("Failed to update rule"); }
    } else {
      const res = await fetch("/api/project-rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ source: "custom", projectId: selectedProjectId, yamlDefinition: customYaml }),
      });
      if (res.ok) {
        const created = await res.json() as ProjectRule;
        setProjectRules((p) => [...p, created]);
        setCustomDialogOpen(false);
        setDirty(true);
        toast.success("Rule created");
      } else { toast.error("Failed to create rule"); }
    }
  }

  async function toggleEnabled(pr: ProjectRule) {
    const res = await fetch(`/api/project-rules/${pr.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ enabled: !pr.enabled }),
    });
    if (res.ok) {
      const updated: ProjectRule = await res.json();
      setProjectRules((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      setDirty(true);
    }
  }

  async function deleteCustomRule(id: string) {
    const res = await fetch(`/api/project-rules/${id}`, { method: "DELETE" });
    if (res.ok) { setProjectRules((p) => p.filter((r) => r.id !== id)); setDirty(true); }
    else toast.error("Failed to delete rule");
  }

  // ——— Publish ———

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/project-rules/publish", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectId: selectedProjectId }),
      });
      if (res.ok) {
        const policy = await res.json() as { version: number };
        setDirty(false);
        toast.success(`Policy v${policy.version} published — agents will update within ~30s`);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to publish");
      }
    } finally {
      setPublishing(false);
    }
  }

  const customRules    = projectRules.filter((r) => r.source === "custom");
  const activeCount    = projectRules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      {/* Project selector */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="shrink-0 text-sm">Application</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Publish banner */}
      {dirty && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm font-medium text-amber-900">
            {activeCount} rule{activeCount !== 1 ? "s" : ""} — changes not yet published to agents
          </p>
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="h-7 text-xs">
            <UploadCloud size={12} className="mr-1" />
            {publishing ? "Publishing…" : "Publish now"}
          </Button>
        </div>
      )}

      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">
            Catalogue
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {catalogueRules.filter((r) => isActive(r.id)).length}/{catalogueRules.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom Rules
            {customRules.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{customRules.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ——— CATALOGUE TAB ——— */}
        <TabsContent value="catalogue" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingRules ? (
                <div className="p-8 text-center text-sm text-text-muted">Loading…</div>
              ) : (
                <div className="divide-y divide-border">
                  {catalogueRules.map((rule) => {
                    const active  = isActive(rule.id);
                    const pr      = getProjectRule(rule.id);
                    const isOverriding = pr && pr.yamlDefinition !== rule.yamlDefinition;
                    const isExpanded  = expandedCatalogueYaml === rule.id;
                    const isOverrideOpen = overrideTarget === rule.id;

                    return (
                      <div key={rule.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={active}
                            onCheckedChange={() => toggleCatalogueRule(rule)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-medium text-text-primary">{rule.name}</span>
                              <Badge variant={SEV[rule.severity] ?? "outline"} className="text-[10px] px-1.5 py-0">
                                {rule.severity}
                              </Badge>
                              <span className="text-xs text-text-muted">{rule.type.replace(/_/g, " ")}</span>
                              {isOverriding && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                                  Modified
                                </Badge>
                              )}
                            </div>
                            {rule.description && <p className="text-xs text-text-muted mt-0.5">{rule.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {rule.yamlDefinition && (
                              <button
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-background text-text-muted hover:text-text-primary transition-colors"
                                onClick={() => setExpandedCatalogueYaml(isExpanded ? null : rule.id)}
                                aria-label="Toggle YAML"
                              >
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            )}
                            {active && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-text-secondary"
                                onClick={() => {
                                  setOverrideTarget(isOverrideOpen ? null : rule.id);
                                  setOverrideYaml(pr?.yamlDefinition ?? rule.yamlDefinition ?? "");
                                }}
                              >
                                <Pencil size={12} className="mr-1" />
                                {isOverriding ? "Edit override" : "Override"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Catalogue YAML view */}
                        {isExpanded && rule.yamlDefinition && (
                          <pre className="ml-12 p-2 rounded bg-background border border-border text-[10px] font-mono overflow-x-auto max-h-40 text-text-primary">
                            {rule.yamlDefinition}
                          </pre>
                        )}

                        {/* Override editor */}
                        {isOverrideOpen && (
                          <div className="ml-12 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-secondary font-medium">Your project override</span>
                              <YamlValidation yaml={overrideYaml} />
                            </div>
                            <Textarea
                              value={overrideYaml}
                              onChange={(e) => setOverrideYaml(e.target.value)}
                              rows={8}
                              className="font-mono text-xs resize-none"
                              spellCheck={false}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs" onClick={saveOverride}>Save override</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOverrideTarget(null)}>Cancel</Button>
                              {isOverriding && pr && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-text-muted"
                                  onClick={() => { setOverrideYaml(rule.yamlDefinition ?? ""); }}
                                >
                                  Reset to catalogue
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ——— CUSTOM RULES TAB ——— */}
        <TabsContent value="custom" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openCreateDialog}>
                <Plus size={13} className="mr-1" /> New Custom Rule
              </Button>
            </div>

            {customRules.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <p className="text-sm text-text-muted">No custom rules yet.</p>
                  <p className="text-xs text-text-muted mt-1">Create rules specific to your application using YAML.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {customRules.map((pr) => (
                      <div key={pr.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Switch checked={pr.enabled} onCheckedChange={() => toggleEnabled(pr)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-medium text-text-primary">{pr.name}</span>
                              <Badge variant={SEV[pr.severity] ?? "outline"} className="text-[10px] px-1.5 py-0">
                                {pr.severity}
                              </Badge>
                              <span className="text-xs text-text-muted">{pr.type.replace(/_/g, " ")}</span>
                              {!pr.enabled && <span className="text-xs text-text-muted italic">disabled</span>}
                            </div>
                            {pr.description && <p className="text-xs text-text-muted mt-0.5">{pr.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEditDialog(pr)}>
                              <Pencil size={12} className="mr-1" /> Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                  <Trash2 size={13} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete rule "{pr.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This rule will be removed from your project. Publish after deletion to update agents.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => deleteCustomRule(pr.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Custom rule create/edit dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Rule" : "New Custom Rule"}</DialogTitle>
            <DialogDescription>
              Define the rule in YAML. Pattern must be a valid JavaScript regex.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rule definition</span>
              <YamlValidation yaml={customYaml} />
            </div>
            <Textarea
              value={customYaml}
              onChange={(e) => setCustomYaml(e.target.value)}
              rows={10}
              className="font-mono text-xs resize-none"
              spellCheck={false}
            />
            <div className="rounded-md bg-background border border-border px-3 py-2 space-y-1">
              <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Pattern examples</p>
              <div className="grid grid-cols-1 gap-0.5 font-mono text-[11px] text-text-muted">
                <span><span className="text-brand">(keyword1|keyword2)</span> — match any of these words</span>
                <span><span className="text-brand">(\.\./|/etc/passwd)</span> — path traversal</span>
                <span><span className="text-brand">(\beval\s*\(|\bexec\s*\()</span> — dangerous function calls</span>
              </div>
              <p className="text-[11px] text-text-muted pt-0.5">Standard JavaScript regex. No <span className="font-mono">(?i)</span> inline flag — use <span className="font-mono">[Aa]</span> for case-insensitive chars if needed.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCustomRule}>{editTarget ? "Save changes" : "Create rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
