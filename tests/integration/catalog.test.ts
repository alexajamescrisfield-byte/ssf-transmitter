import { describe, it, expect } from "vitest";
import { buildCaepEvent, CAEP_EVENT_TYPES } from "../../lib/caep";
import { listVendorScenarios } from "../../lib/vendorScenarios";

// Catalog scenarios now live in the VendorScenario Postgres table (Admin
// catalog page, see HANDOFF_RUNBOOK.md Section 7 item 6) instead of the old
// static lib/catalog.ts map -- these tests read the real table, same as the
// Simulator/History pages do, so they also cover scenarios an admin adds.
describe("catalog scenarios", () => {
  it("every catalog scenario passes required-claim validation", async () => {
    const scenarios = await listVendorScenarios();
    for (const [key, scenario] of Object.entries(scenarios)) {
      expect(() =>
        buildCaepEvent({ ...scenario.event, subjectEmail: "test@example.com" }),
        `scenario "${key}" failed claim validation`,
      ).not.toThrow();
    }
  });

  it("covers at least 3 distinct CAEP types -- Definition of Done criterion 4", async () => {
    const scenarios = await listVendorScenarios();
    const types = new Set(Object.values(scenarios).map((s) => s.event.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("never uses an unsupported 6th CAEP type", async () => {
    const scenarios = await listVendorScenarios();
    const types = new Set(Object.values(scenarios).map((s) => s.event.type));
    for (const t of types) {
      expect(CAEP_EVENT_TYPES).toContain(t);
    }
  });
});
