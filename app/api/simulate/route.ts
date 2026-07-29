import { NextResponse } from "next/server";
import { VENDOR_SCENARIOS } from "@/lib/catalog";
import { sendSsfSignal, StreamNotActiveError } from "@/lib/ssf";
import { getActiveStream } from "@/lib/streams";
import { TENANT_SLUG } from "@/lib/tenant";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const scenarioKey = body?.scenarioKey;
  const subjectEmail = body?.subjectEmail;

  if (typeof scenarioKey !== "string" || typeof subjectEmail !== "string" || !subjectEmail.trim()) {
    return NextResponse.json(
      { error: "scenarioKey and subjectEmail are both required" },
      { status: 400 },
    );
  }

  const scenario = VENDOR_SCENARIOS[scenarioKey];
  if (!scenario) {
    return NextResponse.json({ error: `Unknown scenario: ${scenarioKey}` }, { status: 400 });
  }

  const stream = await getActiveStream(TENANT_SLUG);
  if (!stream) {
    return NextResponse.json(
      { error: `No enabled stream found for tenant ${TENANT_SLUG}. Create/enable one in ISC first.` },
      { status: 409 },
    );
  }

  try {
    const result = await sendSsfSignal({
      tenantSlug: TENANT_SLUG,
      streamId: stream.id,
      scenarioKey,
      event: { ...scenario.event, subjectEmail },
    });

    return NextResponse.json({
      success: result.success,
      httpStatus: result.httpStatus ?? null,
      jti: result.jti,
    });
  } catch (err) {
    if (err instanceof StreamNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
