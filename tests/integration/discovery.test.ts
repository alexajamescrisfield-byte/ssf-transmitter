import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as discoveryGet } from "../../app/t/[slug]/.well-known/ssf-configuration/route";
import { GET as jwksGet } from "../../app/t/[slug]/.well-known/jwks.json/route";
import { createTestTenant, cleanupTenant } from "../helpers/tenant";

describe("discovery", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;

  beforeAll(async () => {
    tenant = await createTestTenant("discovery");
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  it("advertises the exact IETF delivery-method URN ISC requires, not the older schemas.openid.net URI", async () => {
    const res = await discoveryGet(new Request("http://x"), {
      params: Promise.resolve({ slug: tenant.slug }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.delivery_methods_supported).toEqual(["urn:ietf:rfc:8935"]);
  });

  it("issuer is a full URL ending in /t/{slug}, not the bare slug -- regression for the iss-mismatch bug", async () => {
    const res = await discoveryGet(new Request("http://x"), {
      params: Promise.resolve({ slug: tenant.slug }),
    });
    const body = await res.json();

    expect(body.issuer).not.toBe(tenant.slug);
    expect(body.issuer.endsWith(`/t/${tenant.slug}`)).toBe(true);
    expect(body.jwks_uri).toBe(`${body.issuer}/.well-known/jwks.json`);
    expect(body.verification_endpoint).toBe(`${body.issuer}/ssf/verify`);
  });

  it("404s for an unknown tenant slug", async () => {
    const res = await discoveryGet(new Request("http://x"), {
      params: Promise.resolve({ slug: "does-not-exist" }),
    });
    expect(res.status).toBe(404);
  });

  it("serves a public JWK with a kid matching the tenant's signing key", async () => {
    const res = await jwksGet(new Request("http://x"), {
      params: Promise.resolve({ slug: tenant.slug }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].kid).toBe(tenant.signingKey!.kid);
    expect(body.keys[0].alg).toBe("RS256");
    // Public JWK must never leak the private key material.
    expect(body.keys[0]).not.toHaveProperty("d");
  });
});
