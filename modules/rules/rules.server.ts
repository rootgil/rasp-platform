import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function getRules() {
  return prisma.rule.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getRule(id: string) {
  return prisma.rule.findUnique({ where: { id } });
}

export async function createRule(data: {
  name:            string;
  type:            string;
  severity?:       string;
  description?:    string;
  enabled?:        boolean;
  config?:         unknown;
  pattern?:        string;
  target?:         string;
  yamlDefinition?: string;
}) {
  return prisma.rule.create({
    data: {
      name:           data.name,
      type:           data.type,
      severity:       data.severity ?? "medium",
      description:    data.description ?? null,
      enabled:        data.enabled ?? true,
      config:         (data.config ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      pattern:        data.pattern ?? null,
      target:         data.target ?? "any",
      yamlDefinition: data.yamlDefinition ?? null,
    },
  });
}

export async function updateRule(
  id: string,
  data: { name?: string; severity?: string; description?: string; enabled?: boolean; config?: unknown }
) {
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule) return null;
  return prisma.rule.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.severity !== undefined ? { severity: data.severity } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.config !== undefined
        ? { config: (data.config ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function deleteRule(id: string) {
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule) return null;
  return prisma.rule.delete({ where: { id } });
}
