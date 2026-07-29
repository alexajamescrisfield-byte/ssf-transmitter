import { randomUUID } from "crypto";
import { SignJWT } from "jose";
import { prisma } from "./prisma";
import { importSigningPrivateKey } from "./keys";
import { buildCaepEvent, CaepEventInput } from "./caep";

// Root URL this transmitter is publicly reachable at. Must be correct before
// ISC can discover/verify anything -- see the Phase 0 gate. Falls back to
// Vercel's auto-populated production URL so most SEs never have to set this
// by hand; set NEXT_PUBLIC_APP_URL explicitly only if using a custom domain
// or a non-Vercel host.
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  throw new Error(
    "Cannot determine this transmitter's public URL. Set NEXT_PUBLIC_APP_URL, or deploy on Vercel where VERCEL_PROJECT_PRODUCTION_URL is set automatically.",
  );
}

export function tenantIssuer(slug: string): string {
  return `${appBaseUrl()}/t/${slug}`;
}

export function ssfConfigurationDocument(slug: string) {
  const issuer = tenantIssuer(slug);
  return {
    issuer,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    // ISC's Receiver validates this against the exact IETF-registered URN
    // for RFC 8935 (push-based SET delivery), not the older
    // schemas.openid.net-style URI some SSF examples use.
    delivery_methods_supported: ["urn:ietf:rfc:8935"],
    configuration_endpoint: `${issuer}/ssf/streams`,
    status_endpoint: `${issuer}/ssf/status`,
    verification_endpoint: `${issuer}/ssf/verify`,
    default_subjects: "NONE",
  };
}

export class StreamNotActiveError extends Error {
  constructor(status: string) {
    super(`Refusing to send: stream status is "${status}", not "enabled"`);
    this.name = "StreamNotActiveError";
  }
}

interface SendSsfSignalParams {
  tenantSlug: string;
  streamId: string;
  event: CaepEventInput;
  // Which lib/catalog.ts scenario this came from, if any -- purely for the
  // History page's display, not used to build the signal itself.
  scenarioKey?: string;
}

// Build claims -> sign -> push SET. This is the ONLY path that may deliver
// an event to ISC. It always resolves the delivery URL from the stream
// record (never a manually typed one) and always checks stream status first.
export async function sendSsfSignal({
  tenantSlug,
  streamId,
  event,
  scenarioKey,
}: SendSsfSignalParams) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { signingKey: true },
  });
  if (!tenant) throw new Error(`Unknown tenant slug: ${tenantSlug}`);
  if (!tenant.signingKey) {
    throw new Error(`Tenant ${tenantSlug} has no signing key provisioned`);
  }

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, tenantId: tenant.id },
  });
  if (!stream) throw new Error(`Unknown stream ${streamId} for tenant ${tenantSlug}`);
  if (stream.status !== "enabled") {
    throw new StreamNotActiveError(stream.status);
  }

  const events = buildCaepEvent(event);
  const jti = randomUUID();
  const privateKey = await importSigningPrivateKey(tenant.signingKey.privateKeyPem);

  // Per the OpenID SSF spec Section 3.1: "A top-level claim named sub_id
  // MUST be used to describe the primary subject of the event." Not
  // "subject" -- that was the actual bug the whole time.
  const set = await new SignJWT({
    events,
    sub_id: { format: "email", email: event.subjectEmail },
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "secevent+jwt",
      kid: tenant.signingKey.kid,
    })
    .setIssuer(tenantIssuer(tenant.slug))
    .setAudience(tenantIssuer(tenant.slug))
    .setJti(jti)
    .setIssuedAt()
    .sign(privateKey);

  let httpStatus: number | undefined;
  let responseBody: string | undefined;
  let success = false;

  try {
    const res = await fetch(stream.deliveryEndpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/secevent+jwt",
        ...(stream.authorizationHeader
          ? { Authorization: stream.authorizationHeader }
          : {}),
      },
      body: set,
    });
    httpStatus = res.status;
    responseBody = await res.text();
    success = res.ok;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : String(err);
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      streamId: stream.id,
      jti,
      eventType: event.type,
      subject: event.subjectEmail,
      scenarioKey,
      httpStatus,
      responseBody,
      success,
    },
  });

  return { jti, httpStatus, responseBody, success, set };
}

// POST /ssf/verify calls this. Per the OpenID SSF spec, the receiver
// requests verification and the transmitter asynchronously pushes a
// "verification" SET to the stream's delivery endpoint carrying the
// optional `state` the receiver supplied.
export async function sendVerificationSet({
  tenantSlug,
  streamId,
  state,
}: {
  tenantSlug: string;
  streamId: string;
  state?: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { signingKey: true },
  });
  if (!tenant || !tenant.signingKey) {
    throw new Error(`Tenant ${tenantSlug} is not fully provisioned`);
  }

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, tenantId: tenant.id },
  });
  if (!stream) throw new Error(`Unknown stream ${streamId} for tenant ${tenantSlug}`);

  const jti = randomUUID();
  const privateKey = await importSigningPrivateKey(tenant.signingKey.privateKeyPem);

  // Per the OpenID SSF spec Section 3.1: "A top-level claim named sub_id
  // MUST be used to describe the primary subject of the event." Not a
  // "subject" claim (nested or top-level) -- that was the actual bug.
  // Placeholder subject, since verification isn't tied to a real identity.
  const verificationSubject = {
    format: "email",
    email: `verification@${tenant.slug}.ssf-transmitter`,
  };

  const events = {
    "https://schemas.openid.net/secevent/ssf/event-type/verification": {
      ...(state ? { state } : {}),
    },
  };

  const set = await new SignJWT({ events, sub_id: verificationSubject })
    .setProtectedHeader({
      alg: "RS256",
      typ: "secevent+jwt",
      kid: tenant.signingKey.kid,
    })
    .setIssuer(tenantIssuer(tenant.slug))
    .setAudience(tenantIssuer(tenant.slug))
    .setJti(jti)
    .setIssuedAt()
    .sign(privateKey);

  const res = await fetch(stream.deliveryEndpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/secevent+jwt",
      ...(stream.authorizationHeader
        ? { Authorization: stream.authorizationHeader }
        : {}),
    },
    body: set,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      streamId: stream.id,
      jti,
      eventType: "verification",
      subject: "n/a",
      httpStatus: res.status,
      responseBody: await res.text(),
      success: res.ok,
    },
  });

  return { jti, httpStatus: res.status, success: res.ok };
}
