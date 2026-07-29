import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireTenantByBearerToken } from "../../lib/auth";
import { createTestTenant, cleanupTenant } from "../helpers/tenant";

describe("requireTenantByBearerToken", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;

  beforeAll(async () => {
    tenant = await createTestTenant("auth");
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  it("accepts the tenant's real API token", async () => {
    const req = new Request("http://x", {
      headers: { authorization: `Bearer ${tenant.apiToken}` },
    });
    const result = await requireTenantByBearerToken(tenant.slug, req);
    expect(result?.id).toBe(tenant.id);
  });

  it("rejects a missing Authorization header", async () => {
    const req = new Request("http://x");
    expect(await requireTenantByBearerToken(tenant.slug, req)).toBeNull();
  });

  it("rejects a non-Bearer scheme", async () => {
    const req = new Request("http://x", {
      headers: { authorization: `Basic ${tenant.apiToken}` },
    });
    expect(await requireTenantByBearerToken(tenant.slug, req)).toBeNull();
  });

  it("rejects a wrong token", async () => {
    const req = new Request("http://x", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(await requireTenantByBearerToken(tenant.slug, req)).toBeNull();
  });

  it("rejects a token that's valid for a DIFFERENT tenant -- cross-tenant isolation", async () => {
    const other = await createTestTenant("auth-other");
    try {
      const req = new Request("http://x", {
        headers: { authorization: `Bearer ${other.apiToken}` },
      });
      expect(await requireTenantByBearerToken(tenant.slug, req)).toBeNull();
    } finally {
      await cleanupTenant(other.id);
    }
  });

  it("returns null for an unknown tenant slug regardless of token", async () => {
    const req = new Request("http://x", {
      headers: { authorization: `Bearer ${tenant.apiToken}` },
    });
    expect(await requireTenantByBearerToken("no-such-tenant", req)).toBeNull();
  });
});
