import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireSession();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
      select: { id: true, name: true, email: true },
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
