// Throwaway diagnostic: list streams for a tenant so we don't have to hunt
// for the stream_id in ISC's UI.
import { prisma } from "../lib/prisma";

async function main() {
  const slug = process.argv[2] ?? "company21912-poc";
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`No tenant with slug ${slug}`);
    process.exit(1);
  }

  const streams = await prisma.stream.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  for (const s of streams) {
    console.log("----");
    console.log("stream_id:", s.id);
    console.log("status:", s.status);
    console.log("deliveryEndpointUrl:", s.deliveryEndpointUrl);
    console.log("eventsRequested:", s.eventsRequested);
    console.log("createdAt:", s.createdAt.toISOString());
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
