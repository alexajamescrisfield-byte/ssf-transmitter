import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /t/{slug}/.well-known/jwks.json
// Public signing key(s) ISC uses to verify SET signatures. Unauthenticated
// by design -- this is a public key, not a secret.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { signingKey: true },
  });
  if (!tenant || !tenant.signingKey) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }

  return NextResponse.json({
    keys: [JSON.parse(tenant.signingKey.publicKeyJwk)],
  });
}
