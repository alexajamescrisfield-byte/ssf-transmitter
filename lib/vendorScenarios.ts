import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "./prisma";
import { CAEP_EVENT_TYPES, CAEP_REQUIRED_CLAIMS, type CaepEventType } from "./caep";
import type { CaepEventInput } from "./caep";

// DB-backed replacement for the old static lib/catalog.ts map -- see
// prisma/schema.prisma's VendorScenario model for why this moved to
// Postgres (Admin catalog page needs to add scenarios without a redeploy).

export interface VendorScenario {
  vendor: string;
  displayName: string;
  triggerCode: string;
  event: Omit<CaepEventInput, "subjectEmail">;
}

function toVendorScenario(row: {
  vendor: string;
  displayName: string;
  triggerCode: string;
  caepType: string;
  claims: unknown;
  vendorEventType: string | null;
  recommendedAction: string | null;
  reasonAdmin: string | null;
  reasonUser: string | null;
}): VendorScenario {
  return {
    vendor: row.vendor,
    displayName: row.displayName,
    triggerCode: row.triggerCode,
    event: {
      type: row.caepType as CaepEventType,
      claims: (row.claims ?? {}) as Record<string, unknown>,
      vendor: row.vendor,
      vendorEventType: row.vendorEventType ?? undefined,
      recommendedAction: row.recommendedAction ?? undefined,
      reasonAdmin: row.reasonAdmin ?? undefined,
      reasonUser: row.reasonUser ?? undefined,
    },
  };
}

export async function listVendorScenarios(): Promise<Record<string, VendorScenario>> {
  const rows = await prisma.vendorScenario.findMany({ orderBy: [{ vendor: "asc" }, { displayName: "asc" }] });
  const out: Record<string, VendorScenario> = {};
  for (const row of rows) {
    out[row.key] = toVendorScenario(row);
  }
  return out;
}

export async function getVendorScenario(key: string): Promise<VendorScenario | null> {
  const row = await prisma.vendorScenario.findUnique({ where: { key } });
  return row ? toVendorScenario(row) : null;
}

export class InvalidScenarioInputError extends Error {}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CreateVendorScenarioInput {
  vendor: string;
  displayName: string;
  triggerCode: string;
  caepType: string;
  claims: Record<string, unknown>;
  vendorEventType?: string;
  recommendedAction?: string;
  reasonAdmin?: string;
  reasonUser?: string;
}

// Validates and inserts a new catalog entry. Mirrors buildCaepEvent()'s
// required-claim check (lib/caep.ts) so a scenario can never be saved in a
// shape that would fail to fire a Workflow when actually sent.
export async function createVendorScenario(input: CreateVendorScenarioInput) {
  const { vendor, displayName, triggerCode, caepType, claims } = input;

  if (!vendor.trim() || !displayName.trim() || !triggerCode.trim()) {
    throw new InvalidScenarioInputError("Vendor, display name, and trigger code are all required");
  }
  if (!CAEP_EVENT_TYPES.includes(caepType as CaepEventType)) {
    throw new InvalidScenarioInputError(`Unsupported CAEP type: ${caepType}`);
  }
  const required = CAEP_REQUIRED_CLAIMS[caepType as CaepEventType];
  const missing = required.filter((k) => !(k in claims));
  if (missing.length > 0) {
    throw new InvalidScenarioInputError(
      `${caepType} requires claim(s): ${missing.join(", ")}`,
    );
  }

  const baseKey = slugify(`${vendor}-${displayName}`);
  let key = baseKey;
  let suffix = 2;
  while (await prisma.vendorScenario.findUnique({ where: { key } })) {
    key = `${baseKey}-${suffix++}`;
  }

  return prisma.vendorScenario.create({
    data: {
      key,
      vendor: vendor.trim(),
      displayName: displayName.trim(),
      triggerCode: triggerCode.trim(),
      caepType,
      claims: claims as Prisma.InputJsonValue,
      vendorEventType: input.vendorEventType?.trim() || null,
      recommendedAction: input.recommendedAction?.trim() || null,
      reasonAdmin: input.reasonAdmin?.trim() || null,
      reasonUser: input.reasonUser?.trim() || null,
    },
  });
}

export async function deleteVendorScenario(id: string) {
  await prisma.vendorScenario.delete({ where: { id } });
}
