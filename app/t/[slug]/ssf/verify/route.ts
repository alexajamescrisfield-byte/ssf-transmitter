import { NextResponse, after } from "next/server";
import { requireTenantByBearerToken } from "@/lib/auth";
import { sendVerificationSet } from "@/lib/ssf";
import { prisma } from "@/lib/prisma";

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
  // TEMP diagnostic logging -- remove once we confirm ISC's actual verify
  // request shape (headers + body) from Vercel Runtime Logs.
  console.log(
    "[ssf/verify POST] headers=%s body=%s",
    JSON.stringify(Object.fromEntries(request.headers.entries())),
    JSON.stringify(body),
  );
  const streamId: string | undefined = body?.stream_id;
  const state: string | undefined = body?.state;

  if (!streamId) {
    return NextResponse.json({ error: "Missing stream_id" }, { status: 400 });
  }

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, tenantId: tenant.id },
  });
  if (!stream) {
    return NextResponse.json({ error: "Unknown stream_id" }, { status: 404 });
  }

  // `after()` ensures the async SET push actually completes even though
  // we've already returned this response (fire-and-forget without it can
  // get killed mid-flight on Vercel). The real verification happens when
  // ISC receives that pushed SET at its delivery endpoint.
  after(() => sendVerificationSet({ tenantSlug: slug, streamId, state }));
  // Echo back stream_id + the same `state` the receiver sent, per the
  // spec's stated purpose for `state` (correlating a verify request with
  // its response).
  return NextResponse.json({ stream_id: streamId, state });
}
