"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  ChevronDown, ChevronUp, Plus, UploadCloud, Pencil, Trash2,
} from "lucide-react";
import { RuleYamlEditor, isRuleYamlValid } from "@/components/rules/rule-yaml-editor";
import { CUSTOM_RULE_YAML_TEMPLATE } from "@/modules/project-rules/rule-yaml-help";

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

const CUSTOM_TEMPLATE = CUSTOM_RULE_YAML_TEMPLATE;

async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({})) as { error?: string };
  return data.error?.trim() || fallback;
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
  const [needsPublish, setNeedsPublish]           = useState(false);
  const [latestPolicyVersion, setLatestPolicyVersion] = useState<number | null>(null);
  const [enabledRuleCount, setEnabledRuleCount]   = useState(0);
  const [publishedRuleCount, setPublishedRuleCount] = useState(0);

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
      if (res.ok) {
        const data = await res.json() as {
          rules: ProjectRule[];
          publishStatus: {
            latestVersion: number | null;
            needsPublish: boolean;
            enabledCount: number;
            publishedCount: number;
          };
        };
        setProjectRules(data.rules);
        setNeedsPublish(data.publishStatus.needsPublish);
        setLatestPolicyVersion(data.publishStatus.latestVersion);
        setEnabledRuleCount(data.publishStatus.enabledCount);
        setPublishedRuleCount(data.publishStatus.publishedCount);
        setDirty(false);
      }
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => { fetchProjectRules(selectedProjectId); }, [selectedProjectId, fetchProjectRules]);

  // --- Catalogue tab actions ---

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
      toast.error(await readApiError(res, "Failed to save override"), { duration: 8000 });
    }
  }

  // --- Custom tab actions ---

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
    if (!isRuleYamlValid(customYaml)) {
      toast.error("Fix the YAML errors listed in the dialog before saving.");
      return;
    }

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
      } else {
        toast.error(await readApiError(res, "Failed to update rule"), { duration: 8000 });
      }
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
        toast.success("Rule created - click Publish to activate on agents");
      } else {
        toast.error(await readApiError(res, "Failed to create rule"), { duration: 8000 });
      }
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

  // --- Publish ---

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
        toast.success(`Policy v${policy.version} published - agents will update within ~30s`);
        await fetchProjectRules(selectedProjectId);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to publish", { duration: 10000 });
      }
    } finally {
      setPublishing(false);
    }
  }

  const customRules    = projectRules.filter((r) => r.source === "custom");
  const activeCount    = projectRules.filter((r) => r.enabled).length;
  const showPublishBanner = needsPublish || dirty;

  return (
    <div className="space-y-4">
      {/* Project selector */}
      {(projects.length > 1 || projects.length === 1) && (
        <div className="flex items-center gap-3">
          {projects.length > 1 ? (
            <>
              <Label className="shrink-0 text-sm">Application</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Label className="shrink-0 text-sm">Application</Label>
              <span className="text-sm font-medium text-text-primary">{projects[0]?.name}</span>
            </>
          )}
        </div>
      )}

      {/* Publish banner */}
      {showPublishBanner && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm font-medium text-amber-900">
            {latestPolicyVersion == null
              ? `${enabledRuleCount} rule${enabledRuleCount !== 1 ? "s" : ""} enabled - no policy published yet, agents cannot detect anything`
              : publishedRuleCount !== enabledRuleCount
                ? `Policy v${latestPolicyVersion} has ${publishedRuleCount} rule${publishedRuleCount !== 1 ? "s" : ""}, but ${enabledRuleCount} ${enabledRuleCount !== 1 ? "are" : "is"} enabled - publish to sync agents`
                : dirty
                  ? `${enabledRuleCount} rule${enabledRuleCount !== 1 ? "s" : ""} - YAML changed since last publish`
                  : `${enabledRuleCount} rule${enabledRuleCount !== 1 ? "s" : ""} - publish to push updates to agents`}
          </p>
          <Button size="sm" onClick={handlePublish} disabled={publishing || activeCount === 0} className="h-7 text-xs">
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

        {/* --- CATALOGUE TAB --- */}
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
                            <RuleYamlEditor
                              yaml={overrideYaml}
                              onChange={setOverrideYaml}
                              rows={6}
                              showFieldGuide={false}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={saveOverride}
                                disabled={!isRuleYamlValid(overrideYaml)}
                              >
                                Save override
                              </Button>
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

        {/* --- CUSTOM RULES TAB --- */}
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
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Rule" : "New Custom Rule"}</DialogTitle>
            <DialogDescription>
              Required fields: name, type, severity, target, pattern. Publish after saving.
            </DialogDescription>
          </DialogHeader>
          <RuleYamlEditor
            yaml={customYaml}
            onChange={setCustomYaml}
            rows={8}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={saveCustomRule}
              disabled={!isRuleYamlValid(customYaml)}
            >
              {editTarget ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
