import { NextResponse } from "next/server";
import { createVendorScenario, InvalidScenarioInputError } from "@/lib/vendorScenarios";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { vendor, displayName, triggerCode, caepType, claims, vendorEventType, recommendedAction, reasonAdmin, reasonUser } =
    body as Record<string, unknown>;

  if (
    typeof vendor !== "string" ||
    typeof displayName !== "string" ||
    typeof triggerCode !== "string" ||
    typeof caepType !== "string" ||
    typeof claims !== "object" ||
    claims === null
  ) {
    return NextResponse.json(
      { error: "vendor, displayName, triggerCode, caepType, and claims (object) are all required" },
      { status: 400 },
    );
  }

  try {
    const scenario = await createVendorScenario({
      vendor,
      displayName,
      triggerCode,
      caepType,
      claims: claims as Record<string, unknown>,
      vendorEventType: typeof vendorEventType === "string" ? vendorEventType : undefined,
      recommendedAction: typeof recommendedAction === "string" ? recommendedAction : undefined,
      reasonAdmin: typeof reasonAdmin === "string" ? reasonAdmin : undefined,
      reasonUser: typeof reasonUser === "string" ? reasonUser : undefined,
    });
    return NextResponse.json({ scenario });
  } catch (err) {
    if (err instanceof InvalidScenarioInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
