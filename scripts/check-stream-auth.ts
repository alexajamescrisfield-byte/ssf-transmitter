// Throwaway diagnostic: inspect the stored authorization header for a
// stream, and decode it if it looks like a JWT, to check its expiration.
import { prisma } from "../lib/prisma";

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

async function main() {
  const streamId = process.argv[2];
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) {
    console.error("Unknown stream");
    process.exit(1);
  }

  console.log("authorizationHeader:", stream.authorizationHeader);

  const header = stream.authorizationHeader ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length === 3) {
    console.log("--- decoded JWT payload ---");
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    console.log(JSON.stringify(payload, null, 2));
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      console.log("exp:", expDate.toISOString(), expDate < new Date() ? "(EXPIRED)" : "(valid)");
    }
  } else {
    console.log("Does not look like a JWT (not 3 dot-separated parts).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
