import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "./prisma";
import {
  CAEP_EVENT_TYPES,
  CURRENT_LEVEL_VALUES,
  CURRENT_STATUS_VALUES,
  CREDENTIAL_TYPE_VALUES,
  CHANGE_TYPE_VALUES,
  TOKEN_CLAIMS_INITIATING_ENTITY,
  type CaepEventType,
} from "./caep";
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

function assertEnumValue(value: unknown, allowed: readonly string[], field: string): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new InvalidScenarioInputError(
      `${field} must be one of: ${allowed.join(", ")} (got ${JSON.stringify(value)})`,
    );
  }
  return value;
}

// Rebuilds `claims` from validated pieces rather than trusting the caller's
// object shape -- enforced here, not just in the Admin form's UI, so an
// enum typo or a missing initiating_entity is impossible to persist
// regardless of how the request was made (form, or a direct API call).
function normalizeClaims(caepType: CaepEventType, claims: Record<string, unknown>): Record<string, unknown> {
  switch (caepType) {
    case "risk-level-change":
      return {
        current_level: assertEnumValue(claims.current_level, CURRENT_LEVEL_VALUES, "current_level"),
        previous_level: assertEnumValue(claims.previous_level, CURRENT_LEVEL_VALUES, "previous_level"),
      };
    case "device-compliance-change":
      return {
        current_status: assertEnumValue(claims.current_status, CURRENT_STATUS_VALUES, "current_status"),
        previous_status: assertEnumValue(claims.previous_status, CURRENT_STATUS_VALUES, "previous_status"),
      };
    case "credential-change":
      return {
        credential_type: assertEnumValue(claims.credential_type, CREDENTIAL_TYPE_VALUES, "credential_type"),
        change_type: assertEnumValue(claims.change_type, CHANGE_TYPE_VALUES, "change_type"),
      };
    case "session-revoked":
      return {};
    case "token-claims-change": {
      const inner = claims.claims;
      if (typeof inner !== "object" || inner === null || Object.keys(inner).length === 0) {
        throw new InvalidScenarioInputError(
          "token-claims-change requires at least one claim under \"claims\" (e.g. { risk_score: \"high\" })",
        );
      }
      // initiating_entity is always forced to "policy" here -- it's the one
      // value that actually fires the live Workflow (see lib/caep.ts), so a
      // caller-supplied value is never trusted, only ever overwritten.
      return { claims: inner, initiating_entity: TOKEN_CLAIMS_INITIATING_ENTITY };
    }
  }
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

// Validates and inserts a new catalog entry. normalizeClaims() rebuilds the
// claims object from validated, enum-checked pieces (lib/caep.ts's closed
// value lists) rather than trusting whatever shape was submitted -- a
// scenario can never be saved with a claim value ISC would reject, or
// (for token-claims-change) missing the initiating_entity that actually
// fires the live Workflow.
export async function createVendorScenario(input: CreateVendorScenarioInput) {
  const { vendor, displayName, triggerCode, caepType, claims } = input;

  if (!vendor.trim() || !displayName.trim() || !triggerCode.trim()) {
    throw new InvalidScenarioInputError("Vendor, display name, and trigger code are all required");
  }
  if (!CAEP_EVENT_TYPES.includes(caepType as CaepEventType)) {
    throw new InvalidScenarioInputError(`Unsupported CAEP type: ${caepType}`);
  }
  const normalizedClaims = normalizeClaims(caepType as CaepEventType, claims);

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
      claims: normalizedClaims as Prisma.InputJsonValue,
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
