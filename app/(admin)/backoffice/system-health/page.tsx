import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { status: "healthy", detail: `Connected (${latencyMs}ms)` };
  } catch {
    return { status: "offline", detail: "Cannot reach database" };
  }
}

async function checkCollectorHealth() {
  const collectorUrl = process.env.COLLECTOR_INTERNAL_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${collectorUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { status: "healthy", data, detail: "Responding to /health" };
    }
    return { status: "degraded", data: null, detail: `HTTP ${res.status}` };
  } catch {
    return { status: "offline", data: null, detail: "Cannot reach collector - check COLLECTOR_INTERNAL_URL" };
  }
}

export default async function SystemHealthPage() {
  const [dbHealth, collectorHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkCollectorHealth(),
  ]);

  const checks = [
    { name: "PostgreSQL Database", status: dbHealth.status, detail: dbHealth.detail },
    { name: "Collector Service", status: collectorHealth.status, detail: collectorHealth.detail },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" description="Real-time infrastructure status" />

      <div className="grid md:grid-cols-2 gap-4">
        {checks.map((check) => (
          <Card key={check.name}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{check.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{check.detail}</p>
              </div>
              <StatusBadge status={check.status} />
            </CardContent>
          </Card>
        ))}
      </div>

      {collectorHealth.data && (
        <Card>
          <CardHeader><CardTitle>Collector Details</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-text-secondary bg-background p-3 rounded-md">
              {JSON.stringify(collectorHealth.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
