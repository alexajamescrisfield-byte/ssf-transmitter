import { NextResponse } from "next/server";
import { requireTenantByBearerToken } from "@/lib/auth";
import { sendVerificationSet } from "@/lib/ssf";

// POST /t/{slug}/ssf/verify
// ISC calls this to request connection verification. We accept the request
// and push a verification SET to the stream's endpoint_url asynchronously.
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
  const state: string | undefined = body?.state;

  if (!streamId) {
    return NextResponse.json({ error: "Missing stream_id" }, { status: 400 });
  }

  try {
    const result = await sendVerificationSet({
      tenantSlug: slug,
      streamId,
      state,
    });
    return NextResponse.json({ accepted: true, ...result }, { status: 202 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
