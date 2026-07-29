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

  it("covers all 5 supported CAEP types, never a 6th", () => {
    const types = new Set(Object.values(VENDOR_SCENARIOS).map((s) => s.event.type));
    for (const t of types) {
      expect(CAEP_EVENT_TYPES).toContain(t);
    }
    expect(types.size).toBe(5);
  });
});
