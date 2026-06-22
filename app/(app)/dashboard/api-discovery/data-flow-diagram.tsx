"use client";

import { ShieldAlert, Eye, EyeOff, Info } from "lucide-react";

type Endpoint = {
  id: string;
  method: string;
  pathPattern: string;
  hasSensitiveData: boolean;
  sensitiveFields: string[] | null;
  authStatus: string;
  project: { name: string };
};

const PII_LABELS: Record<string, { label: string; severity: "critical" | "high" | "medium" }> = {
  password: { label: "Password", severity: "critical" },
  secret: { label: "Secret / token", severity: "critical" },
  authorization: { label: "Authorization header", severity: "critical" },
  api_key: { label: "API key", severity: "critical" },
  token: { label: "Token", severity: "critical" },
  credit_card: { label: "Credit card number", severity: "critical" },
  sin: { label: "Social Insurance Number", severity: "critical" },
  health_id: { label: "Health card / OHIP / RAMQ", severity: "critical" },
  email: { label: "Email address", severity: "high" },
  phone: { label: "Phone number", severity: "high" },
  ip_address: { label: "IP address", severity: "medium" },
  sql_literal: { label: "SQL literal value", severity: "medium" },
};

function severityClass(s: "critical" | "high" | "medium") {
  if (s === "critical") return "text-critical-text bg-critical-bg border-[#fecaca]";
  if (s === "high") return "text-high bg-[#fff7ed] border-[#fed7aa]";
  return "text-medium-text bg-medium-bg border-[#fde68a]";
}

function methodColor(method: string) {
  switch (method) {
    case "GET": return "text-[#2563eb]";
    case "POST": return "text-[#16a34a]";
    case "PUT":
    case "PATCH": return "text-[#d97706]";
    case "DELETE": return "text-[#dc2626]";
    default: return "text-text-secondary";
  }
}

export function DataFlowDiagram({ endpoints }: { endpoints: Endpoint[] }) {
  const sensitive = endpoints.filter((e) => e.hasSensitiveData);

  if (sensitive.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <ShieldAlert size={32} className="text-success" />
        <p className="text-sm text-text-secondary">No sensitive data flows detected.</p>
        <p className="text-xs text-text-muted max-w-sm">
          The agent will populate this view once it observes endpoints handling PII.
        </p>
      </div>
    );
  }

  // Build a map: fieldKey → list of endpoints that handle it
  const fieldMap = new Map<string, Endpoint[]>();
  for (const ep of sensitive) {
    const fields = ep.sensitiveFields ?? ["unknown"];
    for (const f of fields) {
      const existing = fieldMap.get(f) ?? [];
      existing.push(ep);
      fieldMap.set(f, existing);
    }
  }

  // Sort: critical first
  const sortedFields = Array.from(fieldMap.entries()).sort(([a], [b]) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    const sa = severityOrder[PII_LABELS[a]?.severity ?? "medium"];
    const sb = severityOrder[PII_LABELS[b]?.severity ?? "medium"];
    return sa - sb;
  });

  const unauthSensitive = sensitive.filter((e) => e.authStatus !== "authenticated" && e.authStatus !== "jwt" && e.authStatus !== "session" && e.authStatus !== "api_key");

  return (
    <div className="space-y-6">
      {unauthSensitive.length > 0 && (
        <div className="rounded-md border border-[#fecaca] bg-critical-bg p-4 flex items-start gap-3">
          <ShieldAlert size={16} className="text-critical mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-critical">
              {unauthSensitive.length} sensitive endpoint{unauthSensitive.length > 1 ? "s" : ""} without authentication
            </p>
            <p className="text-xs text-critical mt-0.5">
              These endpoints handle PII but do not enforce authentication. Immediate review required.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedFields.map(([fieldKey, eps]) => {
          const meta = PII_LABELS[fieldKey] ?? { label: fieldKey, severity: "medium" as const };
          return (
            <div key={fieldKey} className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-background border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${severityClass(meta.severity)}`}>
                    {meta.severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">{meta.label}</span>
                  <span className="text-xs text-text-muted font-mono">({fieldKey})</span>
                </div>
                <span className="text-xs text-text-muted">{eps.length} endpoint{eps.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-border">
                {eps.map((ep) => {
                  const noAuth = ep.authStatus !== "authenticated" && ep.authStatus !== "jwt" && ep.authStatus !== "session" && ep.authStatus !== "api_key";
                  return (
                    <div key={ep.id} className="flex items-center justify-between px-4 py-2.5 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-mono text-xs font-bold shrink-0 ${methodColor(ep.method)}`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-xs text-text-secondary truncate">{ep.pathPattern}</span>
                        <span className="text-xs text-text-muted hidden md:inline shrink-0">— {ep.project.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {noAuth ? (
                          <span className="flex items-center gap-1 text-xs text-critical font-medium">
                            <EyeOff size={12} /> No auth
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-success font-medium">
                            <Eye size={12} /> {ep.authStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border p-3 text-xs text-text-muted">
        <Info size={13} className="mt-0.5 shrink-0" />
        <p>
          Fields are detected by the redaction engine observing request / response payloads.
          Accuracy improves with traffic volume. Endpoints with only{" "}
          <span className="font-mono">unknown</span> fields have sensitive data detected by
          pattern matching but no named field identified yet.
        </p>
      </div>
    </div>
  );
}
