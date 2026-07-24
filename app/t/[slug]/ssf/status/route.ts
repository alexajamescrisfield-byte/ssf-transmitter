import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantByBearerToken } from "@/lib/auth";
import { tenantIssuer } from "@/lib/ssf";

// POST /t/{slug}/ssf/status
// Pause/enable/disable a stream. sendSsfSignal() checks this before every
// push -- see lib/ssf.ts StreamNotActiveError.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await requireTenantByBearerToken(slug, request);
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const streamId: string | undefined = body?.stream_id;
  const status: string | undefined = body?.status;

  if (!streamId || !["enabled", "paused", "disabled"].includes(status ?? "")) {
    return NextResponse.json(
      { error: "Requires stream_id and status in {enabled,paused,disabled}" },
      { status: 400 },
    );
  }

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, tenantId: tenant.id },
  });
  if (!stream) {
    return NextResponse.json({ error: "Unknown stream_id" }, { status: 404 });
  }

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: { status: status as "enabled" | "paused" | "disabled" },
  });

  return NextResponse.json({
    stream_id: updated.id,
    iss: tenantIssuer(tenant.slug),
    aud: tenantIssuer(tenant.slug),
    status: updated.status,
  });
}

// GET /t/{slug}/ssf/status?stream_id=...
// ISC reads current stream status this way before/instead of setting it via
// POST -- without this, ISC's "enable stream" action 405s trying to check
// status first.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await requireTenantByBearerToken(slug, request);
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const streamId = new URL(request.url).searchParams.get("stream_id");
  if (!streamId) {
    return NextResponse.json({ error: "Missing stream_id" }, { status: 400 });
  }

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, tenantId: tenant.id },
  });
  if (!stream) {
    return NextResponse.json({ error: "Unknown stream_id" }, { status: 404 });
  }

  return NextResponse.json({
    stream_id: stream.id,
    iss: tenantIssuer(tenant.slug),
    aud: tenantIssuer(tenant.slug),
    status: stream.status,
  });
}
