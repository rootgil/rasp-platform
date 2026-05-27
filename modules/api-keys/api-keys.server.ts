import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function getApiKeys(organizationId: string, projectId?: string) {
  return prisma.apiKey.findMany({
    where: {
      project: { organizationId },
      ...(projectId ? { projectId } : {}),
    },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApiKey(
  projectId: string,
  organizationId: string,
  name?: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  const rawKey = `rasp_${randomBytes(24).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  const keyHash = await bcrypt.hash(rawKey, 10);

  const apiKey = await prisma.apiKey.create({
    data: { projectId, keyHash, prefix, name },
  });

  return { ...apiKey, rawKey };
}

export async function revokeApiKey(id: string, organizationId: string) {
  const key = await prisma.apiKey.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!key) return null;
  return prisma.apiKey.update({ where: { id }, data: { revoked: true } });
}
