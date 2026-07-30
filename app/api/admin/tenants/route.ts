import { NextResponse } from "next/server";
import { createTenant, InvalidTenantInputError } from "@/lib/tenants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const name = body?.name;

  if (typeof slug !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "slug and name are both required" }, { status: 400 });
  }

  try {
    const result = await createTenant(slug, name);
    return NextResponse.json({ tenant: result });
  } catch (err) {
    if (err instanceof InvalidTenantInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
