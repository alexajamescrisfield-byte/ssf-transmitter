import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantByBearerToken } from "@/lib/auth";
import { CAEP_EVENT_TYPES, caepEventTypeUri } from "@/lib/caep";
import { tenantIssuer } from "@/lib/ssf";

// POST /t/{slug}/ssf/streams
// ISC calls this to register a stream after discovery succeeds. ISC supplies
// its own delivery endpoint_url -- we must push only to that URL.
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
  const endpointUrl: string | undefined =
    body?.delivery?.endpoint_url ?? body?.endpoint_url;
  const requestedTypes: string[] = body?.events_requested ?? [];

  if (!endpointUrl) {
    return NextResponse.json(
      { error: "Missing delivery.endpoint_url" },
      { status: 400 },
    );
  }

  const supportedUris = CAEP_EVENT_TYPES.map(caepEventTypeUri);
  const unsupported = requestedTypes.filter((t) => !supportedUris.includes(t));
  if (unsupported.length > 0) {
    return NextResponse.json(
      { error: `Unsupported event type(s): ${unsupported.join(", ")}` },
      { status: 400 },
    );
  }

  const stream = await prisma.stream.create({
    data: {
      tenantId: tenant.id,
      deliveryEndpointUrl: endpointUrl,
      eventsRequested: JSON.stringify(requestedTypes),
      authorizationHeader: body?.delivery?.authorization_header ?? null,
    },
  });

  return NextResponse.json(
    {
      stream_id: stream.id,
      iss: tenantIssuer(tenant.slug),
      aud: body?.aud ?? tenantIssuer(tenant.slug),
      status: stream.status,
      events_requested: requestedTypes,
      events_delivered: requestedTypes,
      delivery: {
        method: "urn:ietf:rfc:8935",
        endpoint_url: stream.deliveryEndpointUrl,
      },
    },
    { status: 201 },
  );
}

// PATCH /t/{slug}/ssf/streams?stream_id=... (or stream_id in the JSON body)
// ISC periodically re-submits the FULL stream configuration here (delivery,
// events_requested, etc.) as a refresh/re-confirmation -- it does NOT send
// a `status` field. Update whichever fields are present and echo back the
// current representation, including status (which this call never changes;
// only POST /ssf/status changes status).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenant = await requireTenantByBearerToken(slug, request);
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const streamId =
    new URL(request.url).searchParams.get("stream_id") ?? body?.stream_id;

  if (!streamId) {
    return NextResponse.json({ error: "Missing stream_id" }, { status: 400 });
  }

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, tenantId: tenant.id },
  });
  if (!stream) {
    return NextResponse.json({ error: "Unknown stream_id" }, { status: 404 });
  }

  const endpointUrl: string | undefined =
    body?.delivery?.endpoint_url ?? undefined;
  const requestedTypes: string[] | undefined = Array.isArray(
    body?.events_requested,
  )
    ? body.events_requested
    : undefined;
  // ISC's token-rotation workflow refreshes this credential via PATCH --
  // failing to capture it here means we keep using the original,
  // eventually-expired authorization header forever.
  const authorizationHeader: string | undefined =
    body?.delivery?.authorization_header ?? undefined;

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: {
      ...(endpointUrl ? { deliveryEndpointUrl: endpointUrl } : {}),
      ...(requestedTypes ? { eventsRequested: JSON.stringify(requestedTypes) } : {}),
      ...(authorizationHeader ? { authorizationHeader } : {}),
    },
  });

  return NextResponse.json({
    stream_id: updated.id,
    iss: tenantIssuer(tenant.slug),
    aud: body?.aud ?? tenantIssuer(tenant.slug),
    status: updated.status,
    events_requested: JSON.parse(updated.eventsRequested),
    events_delivered: JSON.parse(updated.eventsRequested),
    delivery: {
      method: "urn:ietf:rfc:8935",
      endpoint_url: updated.deliveryEndpointUrl,
    },
  });
}

// GET /t/{slug}/ssf/streams
// Lets ISC (or us, for debugging) list streams, or fetch one by ?stream_id=
// (some receivers poll a single stream's status this way rather than
// re-listing all of them).
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

  const shape = (s: { id: string; status: string; eventsRequested: string; deliveryEndpointUrl: string }) => ({
    stream_id: s.id,
    iss: tenantIssuer(tenant.slug),
    aud: tenantIssuer(tenant.slug),
    status: s.status,
    events_requested: JSON.parse(s.eventsRequested),
    events_delivered: JSON.parse(s.eventsRequested),
    delivery: {
      method: "urn:ietf:rfc:8935",
      endpoint_url: s.deliveryEndpointUrl,
    },
  });

  if (streamId) {
    const stream = await prisma.stream.findFirst({
      where: { id: streamId, tenantId: tenant.id },
    });
    if (!stream) {
      return NextResponse.json({ error: "Unknown stream_id" }, { status: 404 });
    }
    return NextResponse.json(shape(stream));
  }

  const streams = await prisma.stream.findMany({
    where: { tenantId: tenant.id },
  });

  return NextResponse.json({ streams: streams.map(shape) });
}
