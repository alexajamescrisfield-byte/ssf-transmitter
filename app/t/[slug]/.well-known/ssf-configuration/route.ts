import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ssfConfigurationDocument } from "@/lib/ssf";

// GET /t/{slug}/.well-known/ssf-configuration
// ISC calls this FIRST, unauthenticated, to discover this transmitter.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }

  return NextResponse.json(ssfConfigurationDocument(slug));
}
