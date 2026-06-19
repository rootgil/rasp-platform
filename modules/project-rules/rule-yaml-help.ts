import type { CompileError } from "./yaml-compiler";

export const CUSTOM_RULE_YAML_TEMPLATE = `name: Path Traversal
type: path_traversal
severity: high
target: any
pattern: '(/etc/passwd|/etc/shadow|/proc/self|win\\.ini|boot\\.ini)'
description: Local file inclusion / path traversal probes
enabled: true`;

export const RULE_YAML_FIELDS = [
  {
    key:         "name",
    required:    true,
    description: "Human-readable label (also used to derive the rule id).",
    example:     "Path Traversal",
  },
  {
    key:         "type",
    required:    true,
    description: "Detection category sent to agents.",
    example:     "path_traversal",
    hint:        "sql_injection, xss, path_traversal, command_injection, custom_rule, …",
  },
  {
    key:         "severity",
    required:    true,
    description: "Alert priority when this rule matches.",
    example:     "high",
    hint:        "critical · high · medium · low",
  },
  {
    key:         "target",
    required:    true,
    description: "Where to scan the HTTP request.",
    example:     "any",
    hint:        "any · path · query · body · headers",
  },
  {
    key:         "pattern",
    required:    true,
    description: "JavaScript regular expression (case-insensitive on agents).",
    example:     "pattern: '(/etc/passwd|win\\.ini)'",
    hint:        "Always wrap in single quotes '…' when the regex contains backslashes.",
  },
  {
    key:         "description",
    required:    false,
    description: "Short explanation shown in the dashboard.",
    example:     "Detects LFI / path traversal probes",
  },
  {
    key:         "enabled",
    required:    false,
    description: "Whether the rule is active after publish (defaults to true).",
    example:     "true",
  },
] as const;

const FIELD_LABELS: Record<string, string> = {
  yaml:     "YAML syntax",
  name:     "name",
  type:     "type",
  severity: "severity",
  target:   "target",
  pattern:  "pattern",
};

/** Turn a compile error into a short, actionable sentence for the UI. */
export function humanizeCompileError(error: CompileError): string {
  const label = FIELD_LABELS[error.field] ?? error.field;
  const msg   = error.message;

  if (error.field === "yaml" && msg.includes("Invalid escape sequence")) {
    return (
      "pattern - double quotes break on backslashes (\\. \\/). " +
      "Use single quotes instead: pattern: '(/etc/passwd|win\\.ini)'"
    );
  }

  if (error.field === "yaml" && /bad indentation|could not find expected/i.test(msg)) {
    return `YAML syntax - check indentation and that each field is on its own line (${msg})`;
  }

  if (error.field === "pattern" && msg.includes("PCRE inline flags")) {
    return "pattern - remove (?i) or /pattern/i wrappers; matching is already case-insensitive on agents";
  }

  if (error.field === "pattern" && msg.includes("Invalid regular expression")) {
    return `pattern - not a valid JavaScript regex: ${msg.replace(/^Invalid regular expression:\s*/i, "")}`;
  }

  if (error.field === "severity") {
    return "severity - must be one of: critical, high, medium, low";
  }

  if (error.field === "target") {
    return "target - must be one of: any, path, query, body, headers";
  }

  if (error.field === "name" || msg.includes("name is required")) {
    return "name - required; give the rule a short title (e.g. Path Traversal)";
  }

  if (error.field === "type" || msg.includes("type is required")) {
    return "type - required; pick a detection category (e.g. path_traversal, custom_rule)";
  }

  if (msg.includes("pattern is required") || error.field === "pattern") {
    return `pattern - ${msg}`;
  }

  return `${label} - ${msg}`;
}

export function formatRuleCompileErrors(errors: CompileError[]): string {
  return errors.map(humanizeCompileError).join(" · ");
}
