import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { decodeJwt } from "jose";
import { sendSsfSignal, sendVerificationSet, StreamNotActiveError } from "../../lib/ssf";
import { MissingCaepClaimsError, caepEventTypeUri } from "../../lib/caep";
import { prisma } from "../../lib/prisma";
import { createTestTenant, cleanupTenant } from "../helpers/tenant";
import { MockReceiver } from "../helpers/mock-receiver";

describe("sendSsfSignal / sendVerificationSet", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let receiver: MockReceiver;
  let streamId: string;

  beforeAll(async () => {
    tenant = await createTestTenant("send");
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  beforeEach(async () => {
    receiver = await MockReceiver.start();
    const stream = await prisma.stream.create({
      data: {
        tenantId: tenant.id,
        deliveryEndpointUrl: receiver.url,
        eventsRequested: JSON.stringify([caepEventTypeUri("risk-level-change")]),
        status: "enabled",
      },
    });
    streamId = stream.id;
  });

  afterEach(async () => {
    await receiver.close();
  });

  it("refuses to send required-claim-incomplete events before ever touching the network", async () => {
    await expect(
      sendSsfSignal({
        tenantSlug: tenant.slug,
        streamId,
        event: {
          type: "risk-level-change",
          subjectEmail: "test@example.com",
          claims: { current_level: "HIGH" }, // missing previous_level
        },
      }),
    ).rejects.toThrow(MissingCaepClaimsError);

    expect(receiver.getRequests()).toHaveLength(0);
  });

  it("refuses to send to a non-enabled stream -- regression for backlog item 'stream status gating'", async () => {
    await prisma.stream.update({ where: { id: streamId }, data: { status: "paused" } });

    await expect(
      sendSsfSignal({
        tenantSlug: tenant.slug,
        streamId,
        event: {
          type: "risk-level-change",
          subjectEmail: "test@example.com",
          claims: { current_level: "HIGH", previous_level: "LOW" },
        },
      }),
    ).rejects.toThrow(StreamNotActiveError);

    expect(receiver.getRequests()).toHaveLength(0);
  });

  it("puts sub_id at the JWT TOP LEVEL, not nested -- regression for the 'subject is required' bug (bugs #8-9)", async () => {
    await sendSsfSignal({
      tenantSlug: tenant.slug,
      streamId,
      event: {
        type: "risk-level-change",
        subjectEmail: "jayme@example.com",
        claims: { current_level: "HIGH", previous_level: "LOW" },
      },
    });

    const requests = receiver.getRequests();
    expect(requests).toHaveLength(1);
    const claims = decodeJwt(requests[0].body);

    expect(claims.sub_id).toEqual({ format: "email", email: "jayme@example.com" });
    // The bug was putting it under events[...].subject instead.
    const event = (claims.events as Record<string, any>)[caepEventTypeUri("risk-level-change")];
    expect(event.subject).toBeDefined(); // fine as legacy/extra context
  });

  it("includes an aud claim on the signed SET itself -- regression for bug #10", async () => {
    await sendSsfSignal({
      tenantSlug: tenant.slug,
      streamId,
      event: {
        type: "risk-level-change",
        subjectEmail: "jayme@example.com",
        claims: { current_level: "HIGH", previous_level: "LOW" },
      },
    });

    const claims = decodeJwt(receiver.getRequests()[0].body);
    expect(claims.aud).toBeTruthy();
  });

  it("sends the content-type ISC's Receiver expects for a signed SET", async () => {
    await sendSsfSignal({
      tenantSlug: tenant.slug,
      streamId,
      event: {
        type: "risk-level-change",
        subjectEmail: "jayme@example.com",
        claims: { current_level: "HIGH", previous_level: "LOW" },
      },
    });

    const headers = receiver.getRequests()[0].headers;
    expect(headers["content-type"]).toBe("application/secevent+jwt");
  });

  it("carries vendor / vendor_event_type / recommended_action as top-level fields inside the event object -- current claim shape per How to Build the SSF Transmitter.md's Event model", async () => {
    await sendSsfSignal({
      tenantSlug: tenant.slug,
      streamId,
      event: {
        type: "risk-level-change",
        subjectEmail: "jayme@example.com",
        claims: { current_level: "HIGH", previous_level: "LOW" },
        vendor: "CrowdStrike",
        vendorEventType: "host_suspected_breach",
        recommendedAction: "disable_account",
      },
    });

    const claims = decodeJwt(receiver.getRequests()[0].body);
    const event = (claims.events as Record<string, any>)[caepEventTypeUri("risk-level-change")];
    expect(event.vendor).toBe("CrowdStrike");
    expect(event.vendor_event_type).toBe("host_suspected_breach");
    expect(event.recommended_action).toBe("disable_account");

    // KNOWN LIMITATION, confirmed 2026-07-27 against a real ISC tenant:
    // ISC's Receiver strips these custom fields before they reach a
    // Workflow trigger, preserving only the official CAEP schema fields
    // (current_level, previous_level, event_timestamp, principal,
    // risk_reason). This test only proves WE send them correctly -- it
    // cannot and does not prove ISC preserves them. See
    // HANDOFF_RUNBOOK.md Section 7 item 5.
  });

  it("sends reason_admin/reason_user as localized objects, not plain strings -- regression for a real ISC parse-rejection bug (2026-07-28)", async () => {
    await sendSsfSignal({
      tenantSlug: tenant.slug,
      streamId,
      event: {
        type: "risk-level-change",
        subjectEmail: "jayme@example.com",
        claims: { current_level: "HIGH", previous_level: "LOW" },
        reasonAdmin: "Some admin-facing reason",
        reasonUser: "Some user-facing reason",
      },
    });

    const claims = decodeJwt(receiver.getRequests()[0].body);
    const event = (claims.events as Record<string, any>)[caepEventTypeUri("risk-level-change")];
    // Sending a bare string here made ISC's parser reject the whole event
    // with "could not JSON decode claim" -- confirmed against a real
    // device-compliance-change send. The CAEP spec's own example shows
    // these as { "en": "..." }.
    expect(event.reason_admin).toEqual({ en: "Some admin-facing reason" });
    expect(event.reason_user).toEqual({ en: "Some user-facing reason" });
  });

  it("logs the send attempt to AuditLog regardless of outcome", async () => {
    const { jti } = await sendSsfSignal({
      tenantSlug: tenant.slug,
      streamId,
      event: {
        type: "risk-level-change",
        subjectEmail: "jayme@example.com",
        claims: { current_level: "HIGH", previous_level: "LOW" },
      },
    });

    const log = await prisma.auditLog.findUnique({ where: { jti } });
    expect(log).not.toBeNull();
    expect(log!.success).toBe(true);
    expect(log!.httpStatus).toBe(202);
  });

  it("verification SET also carries sub_id and aud correctly", async () => {
    await sendVerificationSet({ tenantSlug: tenant.slug, streamId, state: "test-state-123" });

    const claims = decodeJwt(receiver.getRequests()[0].body);
    expect(claims.sub_id).toBeTruthy();
    expect(claims.aud).toBeTruthy();
    const event = claims.events as Record<string, any>;
    expect(
      event["https://schemas.openid.net/secevent/ssf/event-type/verification"].state,
    ).toBe("test-state-123");
  });
});
