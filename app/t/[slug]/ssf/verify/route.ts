import { NextResponse, after } from "next/server";
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

  // ISC's verify call itself just needs a bare success acknowledgment, not
  // the send result -- the real verification happens when ISC receives the
  // pushed SET at its delivery endpoint. `after()` ensures the send
  // actually completes even though we've already returned the response
  // (a bare fire-and-forget call can get killed mid-flight on Vercel).
  after(() => sendVerificationSet({ tenantSlug: slug, streamId, state }));
  return new NextResponse(null, { status: 200 });
}
