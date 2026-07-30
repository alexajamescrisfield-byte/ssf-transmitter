import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;

  if (typeof slug !== "string") {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return NextResponse.json({ error: `Unknown tenant: ${slug}` }, { status: 400 });
  }

  const res = NextResponse.json({ success: true, slug: tenant.slug });
  res.cookies.set(TENANT_COOKIE, tenant.slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
