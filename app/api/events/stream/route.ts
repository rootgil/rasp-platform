import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/events/stream — Server-Sent Events for live security events/alerts.
 * Auth + org-scoped. Polls DB every 2s and pushes new rows (SSE preferred over WebSocket).
 */
export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);

    const url = new URL(req.url);
    let since = url.searchParams.get("since");
    if (!since || Number.isNaN(Date.parse(since))) {
      since = new Date(Date.now() - 60_000).toISOString();
    }

    const encoder = new TextEncoder();
    let closed = false;
    let lastSeen = new Date(since);

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        send("ready", { ok: true, since: lastSeen.toISOString() });

        const tick = async () => {
          if (closed) return;
          try {
            const [events, alerts] = await Promise.all([
              prisma.securityEvent.findMany({
                where: {
                  project: { organizationId: orgId },
                  createdAt: { gt: lastSeen },
                },
                orderBy: { createdAt: "asc" },
                take: 50,
                select: {
                  id: true,
                  type: true,
                  severity: true,
                  method: true,
                  path: true,
                  action: true,
                  createdAt: true,
                  projectId: true,
                },
              }),
              prisma.alert.findMany({
                where: {
                  project: { organizationId: orgId },
                  createdAt: { gt: lastSeen },
                },
                orderBy: { createdAt: "asc" },
                take: 50,
                select: {
                  id: true,
                  severity: true,
                  status: true,
                  createdAt: true,
                  projectId: true,
                  securityEventId: true,
                },
              }),
            ]);

            for (const ev of events) {
              send("event", ev);
              if (ev.createdAt > lastSeen) lastSeen = ev.createdAt;
            }
            for (const al of alerts) {
              send("alert", al);
              if (al.createdAt > lastSeen) lastSeen = al.createdAt;
            }
          } catch (err) {
            send("error", { message: "poll_failed" });
            console.error("[events/stream]", err);
          }
        };

        const interval = setInterval(() => {
          void tick();
        }, 2000);
        void tick();

        const heartbeat = setInterval(() => {
          if (!closed) {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        }, 15000);

        req.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
