import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function getRedactionPolicies(organizationId: string) {
  return prisma.redactionPolicy.findMany({
    where: { project: { organizationId } },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRedactionPolicy(
  projectId: string,
  organizationId: string,
  data: { mode: string; rules?: unknown }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;
  return prisma.redactionPolicy.create({
    data: {
      projectId,
      mode: data.mode,
      rules: (data.rules ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
    },
  });
}

export async function updateRedactionPolicy(
  id: string,
  organizationId: string,
  data: { mode?: string; rules?: unknown }
) {
  const policy = await prisma.redactionPolicy.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!policy) return null;
  return prisma.redactionPolicy.update({
    where: { id },
    data: {
      ...(data.mode !== undefined ? { mode: data.mode } : {}),
      ...(data.rules !== undefined
        ? { rules: (data.rules ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue }
        : {}),
    },
  });
}
