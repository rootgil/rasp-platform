import { prisma } from "@/lib/prisma";

export async function listContactLeads() {
  return prisma.contactLead.findMany({
    orderBy: { createdAt: "desc" },
  });
}
