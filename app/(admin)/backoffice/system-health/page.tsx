import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemHealth } from "@/modules/admin/health.server";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const { overall, checks, collector, checkedAt } = await getSystemHealth();

  const runtime = checks.filter((c) => c.group === "runtime");
  const config = checks.filter((c) => c.group === "config");

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Required infrastructure and configuration readiness"
      />

      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted">Overall status</p>
            <p className="font-medium text-text-primary mt-0.5">
              {overall === "healthy"
                ? "All required systems reachable"
                : overall === "degraded"
                  ? "Some required systems are degraded"
                  : "One or more required systems are down"}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Checked at {new Date(checkedAt).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={overall} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Runtime
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {runtime.map((check) => (
            <Card key={check.name}>
              <CardContent className="p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {check.name}
                    {!check.required && (
                      <span className="ml-2 text-xs font-normal text-text-muted">optional</span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 break-words">{check.detail}</p>
                </div>
                <StatusBadge status={check.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Configuration
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {config.map((check) => (
            <Card key={check.name}>
              <CardContent className="p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {check.name}
                    {!check.required && (
                      <span className="ml-2 text-xs font-normal text-text-muted">optional</span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 break-words">{check.detail}</p>
                </div>
                <StatusBadge status={check.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {collector && (
        <Card>
          <CardHeader>
            <CardTitle>Collector details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-text-secondary bg-background p-3 rounded-md overflow-x-auto">
              {JSON.stringify(collector, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
