import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { normalizePatternForJs } from "./pattern-normalize";
import { humanizeCompileError } from "./rule-yaml-help";

export {
  normalizePatternForJs,
  isPatternValidForAgent,
  AGENT_REGEX_FLAGS,
  type PatternNormalizeResult,
} from "./pattern-normalize";

const VALID_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const VALID_TARGETS = ["any", "path", "query", "body", "headers"] as const;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // id is optional - auto-derived from name if omitted
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

/** Thrown by {@link compileRulesOrThrow} when one or more rules fail validation. */
export class RuleCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleCompileError";
  }
}

/** Escape a value for a YAML single-quoted scalar (backslashes stay literal). */
export function yamlSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Rewrite `pattern: "..."` to single-quoted form before YAML parse.
 * Double-quoted YAML rejects regex escapes such as `\.` and `\/`.
 */
export function sanitizeRuleYamlBeforeParse(yamlText: string): string {
  return yamlText.replace(/^pattern:\s*"(.*)"\s*$/m, (_, inner: string) => {
    return `pattern: ${yamlSingleQuoted(inner)}`;
  });
}

/**
 * Parse and validate a YAML string representing a single detection rule.
 * Returns the compiled CustomRuleSpec on success, or an array of errors.
 */
export function compileRuleYaml(yamlText: string): CompileResult | { errors: CompileError[] } {
  let raw: unknown;
  try {
    raw = parseYaml(sanitizeRuleYamlBeforeParse(yamlText.trim()));
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

  const normalized = normalizePatternForJs(data.pattern);
  if ("error" in normalized) {
    return { errors: [{ field: "pattern", message: normalized.error }] };
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
    pattern:     normalized.pattern,
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
  for (let i = 0; i < yamlTexts.length; i++) {
    const text = yamlTexts[i];
    const result = compileRuleYaml(text);
    if ("errors" in result) {
      let label = `rule #${i + 1}`;
      try {
        const raw = parseYaml(text) as { name?: string };
        if (raw?.name) label = `"${raw.name}"`;
      } catch { /* ignore */ }
      const msg = result.errors.map((e) => humanizeCompileError(e)).join("\n");
      throw new RuleCompileError(`${label} validation failed:\n${msg}`);
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
  const normalized = normalizePatternForJs(r.pattern);
  const pattern = "error" in normalized ? r.pattern.trim() : normalized.pattern;

  const lines = [
    `id: ${r.id}`,
    `name: ${r.name}`,
    `type: ${r.type}`,
    `severity: ${r.severity}`,
    `target: ${r.target}`,
    `pattern: ${yamlSingleQuoted(pattern)}`,
  ];
  if (r.description) lines.push(`description: ${r.description}`);
  lines.push(`enabled: ${r.enabled ?? true}`);
  return lines.join("\n");
}
