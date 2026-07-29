import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  POST as streamsPost,
  GET as streamsGet,
  PATCH as streamsPatch,
} from "../../app/t/[slug]/ssf/streams/route";
import { caepEventTypeUri } from "../../lib/caep";
import { createTestTenant, cleanupTenant, authHeaders } from "../helpers/tenant";

describe("ssf/streams", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;

  beforeAll(async () => {
    tenant = await createTestTenant("streams");
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  function postRequest(body: unknown) {
    return new Request(`http://x/t/${tenant.slug}/ssf/streams`, {
      method: "POST",
      headers: { ...authHeaders(tenant.apiToken), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects requests without a valid bearer token", async () => {
    const res = await streamsPost(
      new Request(`http://x/t/${tenant.slug}/ssf/streams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delivery: { endpoint_url: "http://x" } }),
      }),
      { params: Promise.resolve({ slug: tenant.slug }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects unsupported event type URIs -- never invent a 6th CAEP type", async () => {
    const res = await streamsPost(
      postRequest({
        delivery: { endpoint_url: "http://127.0.0.1:1" },
        events_requested: ["https://schemas.openid.net/secevent/caep/event-type/not-a-real-type"],
      }),
      { params: Promise.resolve({ slug: tenant.slug }) },
    );
    expect(res.status).toBe(400);
  });

  it("create response includes a full-URL iss and a status field -- regression for bugs #2 and #3", async () => {
    const res = await streamsPost(
      postRequest({
        delivery: { endpoint_url: "http://127.0.0.1:1/deliver" },
        events_requested: [caepEventTypeUri("risk-level-change")],
      }),
      { params: Promise.resolve({ slug: tenant.slug }) },
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.iss).not.toBe(tenant.slug);
    expect(body.iss.endsWith(`/t/${tenant.slug}`)).toBe(true);
    expect(body.status).toBe("enabled");
    expect(body.stream_id).toBeTruthy();
  });

  describe("once a stream exists", () => {
    let streamId: string;

    beforeEach(async () => {
      const res = await streamsPost(
        postRequest({
          delivery: { endpoint_url: "http://127.0.0.1:1/deliver" },
          events_requested: [caepEventTypeUri("risk-level-change")],
        }),
        { params: Promise.resolve({ slug: tenant.slug }) },
      );
      streamId = (await res.json()).stream_id;
    });

    it("GET by stream_id includes aud -- regression for the 'aud is empty' bug", async () => {
      const res = await streamsGet(
        new Request(`http://x/t/${tenant.slug}/ssf/streams?stream_id=${streamId}`, {
          headers: authHeaders(tenant.apiToken),
        }),
        { params: Promise.resolve({ slug: tenant.slug }) },
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.aud).toBeTruthy();
      expect(body.aud).not.toBe(tenant.slug);
    });

    it("PATCH refresh with no status field in the body still succeeds -- regression for bug #5", async () => {
      const res = await streamsPatch(
        new Request(`http://x/t/${tenant.slug}/ssf/streams?stream_id=${streamId}`, {
          method: "PATCH",
          headers: { ...authHeaders(tenant.apiToken), "content-type": "application/json" },
          body: JSON.stringify({
            delivery: { endpoint_url: "http://127.0.0.1:1/deliver-v2" },
            events_requested: [caepEventTypeUri("risk-level-change")],
          }),
        }),
        { params: Promise.resolve({ slug: tenant.slug }) },
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.delivery.endpoint_url).toBe("http://127.0.0.1:1/deliver-v2");
    });

    it("PATCH captures a rotated authorization_header -- regression for bug #12, the token-rotation bug that cost the most time this session", async () => {
      await streamsPatch(
        new Request(`http://x/t/${tenant.slug}/ssf/streams?stream_id=${streamId}`, {
          method: "PATCH",
          headers: { ...authHeaders(tenant.apiToken), "content-type": "application/json" },
          body: JSON.stringify({
            delivery: {
              endpoint_url: "http://127.0.0.1:1/deliver",
              authorization_header: "Bearer rotated-token-abc123",
            },
          }),
        }),
        { params: Promise.resolve({ slug: tenant.slug }) },
      );

      const { prisma } = await import("../../lib/prisma");
      const stored = await prisma.stream.findUniqueOrThrow({ where: { id: streamId } });
      expect(stored.authorizationHeader).toBe("Bearer rotated-token-abc123");
    });
  });
});
