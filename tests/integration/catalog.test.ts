import { describe, it, expect } from "vitest";
import { buildCaepEvent, CAEP_EVENT_TYPES } from "../../lib/caep";
import { VENDOR_SCENARIOS } from "../../lib/catalog";

describe("catalog scenarios", () => {
  it("every catalog scenario passes required-claim validation", () => {
    for (const [key, scenario] of Object.entries(VENDOR_SCENARIOS)) {
      expect(() =>
        buildCaepEvent({ ...scenario.event, subjectEmail: "test@example.com" }),
        `scenario "${key}" failed claim validation`,
      ).not.toThrow();
    }
  });

  it("covers at least 3 distinct CAEP types -- Definition of Done criterion 4", () => {
    const types = new Set(Object.values(VENDOR_SCENARIOS).map((s) => s.event.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("never uses an unsupported 6th CAEP type", () => {
    const types = new Set(Object.values(VENDOR_SCENARIOS).map((s) => s.event.type));
    for (const t of types) {
      expect(CAEP_EVENT_TYPES).toContain(t);
    }
    // Not asserting types.size === 5: the catalog is restricted to 5
    // vendors (Okta/Microsoft/CrowdStrike/Proofpoint/Jamf) with realistic,
    // honestly-mapped events (2026-07-29) -- none of those vendors'  real
    // event sets naturally produce a token-claims-change scenario, so 4 of
    // 5 types is the accurate, deliberate result, not a gap.
  });
});
