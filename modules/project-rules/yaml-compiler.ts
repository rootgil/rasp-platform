import { parse as parseYaml } from "yaml";
import { z } from "zod";

const VALID_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const VALID_TARGETS = ["any", "path", "query", "body", "headers"] as const;
const VALID_TYPES = [
  "sql_injection",
  "nosql_injection",
  "path_traversal",
  "command_injection",
  "xss",
  "xxe",
  "ssrf",
  "template_injection",
  "bola_idor",
  "brute_force",
  "deserialization",
  "suspicious_payload",
  "prototype_pollution",
  "suspicious_headers",
  "custom_rule",
] as const;

export const RuleYamlSchema = z.object({
  // id is optional — auto-derived from name if omitted
  id:          z.string().optional(),
  name:        z.string().min(1, "name is required"),
  type:        z.string().min(1, "type is required"),
  severity:    z.enum(VALID_SEVERITIES, { message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` }),
  target:      z.enum(VALID_TARGETS, { message: `target must be one of: ${VALID_TARGETS.join(", ")}` }),
  pattern:     z.string().min(1, "pattern is required"),
  description: z.string().optional(),
  enabled:     z.boolean().default(true),
});

export type RuleYaml = z.infer<typeof RuleYamlSchema>;

export interface CustomRuleSpec {
  id:          string;
  name:        string;
  eventType:   string;
  severity:    "critical" | "high" | "medium" | "low";
  target:      "any" | "path" | "query" | "body" | "headers";
  pattern:     string;
  description: string | undefined;
  enabled:     boolean;
}

export interface CompileResult {
  spec:   CustomRuleSpec;
  yaml:   RuleYaml;
}

export interface CompileError {
  field:   string;
  message: string;
}

/**
 * Parse and validate a YAML string representing a single detection rule.
 * Returns the compiled CustomRuleSpec on success, or an array of errors.
 */
export function compileRuleYaml(yamlText: string): CompileResult | { errors: CompileError[] } {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (e) {
    return { errors: [{ field: "yaml", message: e instanceof Error ? e.message : "Invalid YAML" }] };
  }

  const parsed = RuleYamlSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: CompileError[] = parsed.error.issues.map((e) => ({
      field:   e.path.join(".") || "unknown",
      message: e.message,
    }));
    return { errors };
  }

  const { data } = parsed;

  // Validate that pattern compiles as a RegExp
  try {
    new RegExp(data.pattern);
  } catch {
    return { errors: [{ field: "pattern", message: "pattern is not a valid regular expression" }] };
  }

  // Auto-derive id from name if not provided
  const id = data.id?.trim() ||
    data.name.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

  const spec: CustomRuleSpec = {
    id,
    name:        data.name,
    eventType:   data.type,
    severity:    data.severity,
    target:      data.target,
    pattern:     data.pattern,
    description: data.description,
    enabled:     data.enabled,
  };

  return { spec, yaml: data };
}

/**
 * Compile an array of YAML strings into CustomRuleSpec[].
 * Throws if any rule fails validation (with a descriptive message).
 */
export function compileRulesOrThrow(yamlTexts: string[]): CustomRuleSpec[] {
  const specs: CustomRuleSpec[] = [];
  for (const text of yamlTexts) {
    const result = compileRuleYaml(text);
    if ("errors" in result) {
      const msg = result.errors.map((e) => `  ${e.field}: ${e.message}`).join("\n");
      throw new Error(`Rule validation failed:\n${msg}`);
    }
    if (result.spec.enabled !== false) {
      specs.push(result.spec);
    }
  }
  return specs;
}

/**
 * Build the canonical YAML string for a rule object.
 * Used when creating catalogue rules or copying catalogue → project.
 */
export function buildRuleYaml(r: {
  id:          string;
  name:        string;
  type:        string;
  severity:    string;
  target:      string;
  pattern:     string;
  description?: string | null;
  enabled?:    boolean;
}): string {
  const lines = [
    `id: ${r.id}`,
    `name: ${r.name}`,
    `type: ${r.type}`,
    `severity: ${r.severity}`,
    `target: ${r.target}`,
    `pattern: "${r.pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  ];
  if (r.description) lines.push(`description: ${r.description}`);
  lines.push(`enabled: ${r.enabled ?? true}`);
  return lines.join("\n");
}
