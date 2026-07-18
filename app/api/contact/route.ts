import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limited = checkRateLimit(`contact:${ip}`, 5, 60 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }
    await prisma.contactLead.create({ data: parsed.data });
    return Response.json({ success: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
