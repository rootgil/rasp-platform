/**
 * JavaScript regex normalization for policy detection rules.
 *
 * The agent compiles every rule with the {@link AGENT_REGEX_FLAGS} flag
 * ({@link CustomRuleDetector} in agent-node). Patterns must be valid JS regex
 * after PCRE-style prefixes are stripped.
 */

/** Flags applied by the agent when compiling policy rules. */
export const AGENT_REGEX_FLAGS = "i";

export interface PatternNormalizeResult {
  pattern: string;
  /** True if PCRE-style inline flags were stripped from the source pattern. */
  hadPcreFlags: boolean;
}

/**
 * Normalize a regex pattern for JavaScript / agent execution.
 *
 * Accepts common non-JS forms and converts them to plain JS patterns validated
 * with {@link AGENT_REGEX_FLAGS}:
 * - PCRE prefixes: `(?i)`, `(?ims)`, `(?i:…)`, `/pattern/flags`
 * - Surrounding whitespace
 *
 * Returns `{ error }` when the result is empty or invalid in JS.
 */
export function normalizePatternForJs(
  raw: string
): PatternNormalizeResult | { error: string } {
  let pattern = raw.trim();
  if (!pattern) {
    return { error: "pattern is required" };
  }

  let hadPcreFlags = false;

  // Literal /pattern/flags (common when copy-pasting from regex testers).
  const literal = /^\/((?:\\.|[^/\\])+)\/([gimsuy]*)$/.exec(pattern);
  if (literal) {
    pattern = literal[1].replace(/\\\//g, "/");
    hadPcreFlags = literal[2].length > 0;
  }

  // Repeatedly peel PCRE inline modifiers until stable.
  let changed = true;
  while (changed) {
    changed = false;

    // Leading modifier-only group: (?i), (?ims), (?-i), etc.
    const lead = /^\(\?(-?[imsux]+)\)([\s\S]*)$/.exec(pattern);
    if (lead) {
      pattern = lead[2].trim();
      hadPcreFlags = true;
      changed = true;
      continue;
    }

    // Entire pattern wrapped as (?flags:body) - unwrap the body.
    const wrapped = /^\(\?(-?[imsux]*):([\s\S]+)\)$/.exec(pattern);
    if (wrapped) {
      pattern = wrapped[2].trim();
      hadPcreFlags = true;
      changed = true;
    }
  }

  if (!pattern) {
    return { error: "pattern is empty after removing PCRE inline flags" };
  }

  // Remaining inline flag groups mid-pattern are invalid in JS - fail early with a clear hint.
  if (/\(\?[imsux-]+[:)]/.test(pattern)) {
    return {
      error:
        "pattern contains PCRE inline flags (e.g. (?i:…)) that JavaScript does not support - use plain JS regex; matching is case-insensitive by default",
    };
  }

  const validated = validateJsRegex(pattern);
  if ("error" in validated) {
    const repaired = repairLegacyDoubledEscapes(pattern);
    if (repaired) {
      const retry = validateJsRegex(repaired);
      if (!("error" in retry)) {
        return { pattern: repaired, hadPcreFlags };
      }
    }
    return validated;
  }

  return { pattern: validated.pattern, hadPcreFlags };
}

function validateJsRegex(
  pattern: string
): { pattern: string } | { error: string } {
  const MAX_PATTERN_LENGTH = 512;
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { error: `pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters` };
  }

  // Heuristic anti-ReDoS: nested quantifiers / ambiguous repetition.
  if (/(?:\+|\*|\{)\s*(?:\+|\*|\{)|(?:\([^)]*[+*][^)]*\))[+*]/.test(pattern)) {
    return {
      error:
        "pattern rejected: nested or ambiguous quantifiers may cause catastrophic backtracking (ReDoS)",
    };
  }
  // Excessively nested groups.
  let depth = 0;
  let maxDepth = 0;
  for (const ch of pattern) {
    if (ch === "(") {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
    }
  }
  if (maxDepth > 12) {
    return { error: "pattern rejected: nesting depth exceeds safe limit" };
  }

  try {
    new RegExp(pattern, AGENT_REGEX_FLAGS);
    return { pattern };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "invalid syntax";
    return { error: `pattern is not a valid JavaScript regular expression: ${detail}` };
  }
}

/** Legacy catalogue YAML stored `\\s` instead of `\s` inside double-quoted patterns. */
function repairLegacyDoubledEscapes(pattern: string): string | null {
  if (!/\\\\/.test(pattern)) return null;
  const repaired = pattern.replace(/\\\\/g, "\\");
  return repaired === pattern ? null : repaired;
}

/** Convenience check for UI validation. */
export function isPatternValidForAgent(raw: string): boolean {
  const result = normalizePatternForJs(raw);
  return !("error" in result);
}
