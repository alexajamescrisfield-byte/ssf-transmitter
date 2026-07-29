// Isolated experiment -- does NOT touch lib/ssf.ts or any proven code path.
// Manually builds and signs a JWT using the teammate's "complex" sub_id
// wrapper format (sub_id: {format:"complex", user:{format:"email",
// email:...}}) instead of our own proven flat format
// (sub_id: {format:"email", email:...}), to see whether ISC still
// correlates it against company21912-poc. Uses risk-level-change since
// that CAEP type already has a working Workflow (PRISM disable) --
// if the Workflow fires, correlation succeeded; if not, it didn't.
import { readFileSync } from "fs";
import { join } from "path";
import { SignJWT } from "jose";
import { prisma } from "../lib/prisma";
import { importSigningPrivateKey } from "../lib/keys";
import { tenantIssuer } from "../lib/ssf";
import { randomUUID } from "crypto";

async function main() {
  const tenantSlug = "company21912-poc";
  const streamId = "cms3q1gtr000004icv23hv0o3";
  const subjectEmail = "Jayme.Cannon@sailpointdemo.com";

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { signingKey: true },
  });
  if (!tenant?.signingKey) throw new Error("tenant/signing key not found");

  const stream = await prisma.stream.findFirst({ where: { id: streamId, tenantId: tenant.id } });
  if (!stream) throw new Error("stream not found");

  const privateKey = await importSigningPrivateKey(tenant.signingKey.privateKeyPem);
  const jti = randomUUID();

  const events = {
    "https://schemas.openid.net/secevent/caep/event-type/risk-level-change": {
      current_level: "HIGH",
      previous_level: "LOW",
      event_timestamp: Math.floor(Date.now() / 1000),
    },
  };

  // The teammate's exact "complex" wrapper shape, applied to BOTH sub_id
  // (top-level) and a redundant nested "subject" (matching what their
  // export also did) -- testing the full shape as exported, not a
  // simplified version.
  const complexSubject = {
    format: "complex",
    user: { format: "email", email: subjectEmail },
  };

  const set = await new SignJWT({
    events: {
      ...events,
      "https://schemas.openid.net/secevent/caep/event-type/risk-level-change": {
        ...events["https://schemas.openid.net/secevent/caep/event-type/risk-level-change"],
        subject: complexSubject,
      },
    },
    sub_id: complexSubject,
  })
    .setProtectedHeader({ alg: "RS256", typ: "secevent+jwt", kid: tenant.signingKey.kid })
    .setIssuer(tenantIssuer(tenant.slug))
    .setAudience(tenantIssuer(tenant.slug))
    .setJti(jti)
    .setIssuedAt()
    .sign(privateKey);

  const res = await fetch(stream.deliveryEndpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/secevent+jwt",
      ...(stream.authorizationHeader ? { Authorization: stream.authorizationHeader } : {}),
    },
    body: set,
  });

  console.log("jti:", jti);
  console.log("httpStatus:", res.status);
  console.log("responseBody:", await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
