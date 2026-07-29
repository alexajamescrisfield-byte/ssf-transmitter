import { prisma } from "./prisma";

// Picks which Stream a signal actually goes out on: the most recently
// created "enabled" stream for the tenant. A tenant can accumulate old,
// expired-credential streams over time (see HANDOFF_RUNBOOK.md Section 9.0
// item 2 -- the abandoned v1 Receiver/Stream) -- always prefer the newest
// enabled one rather than requiring a stream id to be passed around the UI.
export async function getActiveStream(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return null;

  return prisma.stream.findFirst({
    where: { tenantId: tenant.id, status: "enabled" },
    orderBy: { createdAt: "desc" },
  });
}
