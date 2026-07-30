#!/usr/bin/env bash
# Pre-drop validation gate for the signing-key Vault migration.
# Run from the repo root: bash scripts/validate_key_migration.sh
#
# Adapted to this project's actual stack: Supabase Vault (a Postgres
# extension, SQL-based) rather than HashiCorp Vault -- there is no `vault`
# CLI here, checks run via lib/vault.ts against vault.decrypted_secrets.
#
# Exits 0 only if every check that CAN be verified from this machine passes.
# Gate 5 (backup coverage) cannot be verified from here -- see its own
# output for why -- and is reported as SKIP, not forced to PASS or FAIL.
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
SKIP=0
declare -a RESULTS=()

record() {
  local status="$1" name="$2"
  RESULTS+=("$status|$name")
  case "$status" in
    PASS) PASS=$((PASS+1)) ;;
    FAIL) FAIL=$((FAIL+1)) ;;
    SKIP) SKIP=$((SKIP+1)) ;;
  esac
}

echo "== Gate 1: Vault key retrieval + fingerprint match =="
if npx tsx --env-file=.env - <<'EOF'
import { prisma } from "./lib/prisma";
import { readSecret } from "./lib/vault";
import { createPrivateKey, createPublicKey } from "crypto";

async function main() {
  const key = await prisma.signingKey.findFirst();
  if (!key || !key.privateKeySecretId) throw new Error("no signing key / secretId");
  const pem = await readSecret(key.privateKeySecretId);
  if (!pem.includes("-----BEGIN PRIVATE KEY-----") || !pem.includes("-----END PRIVATE KEY-----")) {
    throw new Error("PEM markers missing");
  }
  const derivedJwk = createPublicKey(createPrivateKey(pem)).export({ format: "jwk" }) as { n?: string };
  const storedJwk = JSON.parse(key.publicKeyJwk) as { n?: string };
  if (derivedJwk.n !== storedJwk.n) throw new Error("fingerprint mismatch: vault key does not match published JWKS");
  console.log("kid:", key.kid, "| fingerprint match: yes");
}
main().finally(() => prisma.$disconnect());
EOF
then record PASS "Gate 1: Vault key retrieval"; else record FAIL "Gate 1: Vault key retrieval"; fi
echo

echo "== Gate 2: Application integration (sign+verify using ONLY the vault-fetched key) =="
if npx tsx --env-file=.env - <<'EOF'
import { prisma } from "./lib/prisma";
import { importSigningPrivateKey } from "./lib/keys";
import { readSecret } from "./lib/vault";
import { SignJWT, importJWK, jwtVerify } from "jose";

async function main() {
  const key = await prisma.signingKey.findFirst();
  if (!key || !key.privateKeySecretId) throw new Error("no key");
  const privateKey = await importSigningPrivateKey(await readSecret(key.privateKeySecretId));
  const set = await new SignJWT({ test: "gate-script" })
    .setProtectedHeader({ alg: "RS256", typ: "secevent+jwt", kid: key.kid })
    .setIssuedAt()
    .sign(privateKey);
  const publicKey = await importJWK(JSON.parse(key.publicKeyJwk), "RS256");
  const { payload } = await jwtVerify(set, publicKey);
  if (payload.test !== "gate-script") throw new Error("payload roundtrip failed");
  console.log("sign+verify roundtrip: ok");
}
main().finally(() => prisma.$disconnect());
EOF
then
  if grep -rq "\.privateKeyPem" lib/ssf.ts; then
    echo "FAIL: lib/ssf.ts still reads .privateKeyPem directly (fallback path exists)"
    record FAIL "Gate 2: Application integration"
  else
    record PASS "Gate 2: Application integration"
  fi
else
  record FAIL "Gate 2: Application integration"
fi
echo

echo "== Gate 3: DB column still present (pre-drop sanity) =="
if npx tsx --env-file=.env - <<'EOF'
import { prisma } from "./lib/prisma";
async function main() {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "SigningKey" WHERE "privateKeyPem" IS NOT NULL`,
  );
  const n = Number(rows[0].count);
  console.log("non-null privateKeyPem rows:", n);
  if (n < 1) throw new Error("expected at least 1 non-null row before drop");
}
main().finally(() => prisma.$disconnect());
EOF
then record PASS "Gate 3: DB column pre-drop sanity"; else record FAIL "Gate 3: DB column pre-drop sanity"; fi
echo

echo "== Gate 4: No plaintext key in tracked source, git history, or .env =="
LEAK=0
if grep -rn "BEGIN.*PRIVATE KEY" --include="*.ts" --include="*.tsx" --include="*.md" . 2>/dev/null \
    | grep -v node_modules | grep -v "app/generated" | grep -v "\.next/"; then
  LEAK=1
fi
if [ -f .env ] && grep -q "BEGIN.*PRIVATE KEY" .env 2>/dev/null; then
  LEAK=1
fi
if git log --all -p -- . 2>/dev/null | grep -q "BEGIN.*PRIVATE KEY"; then
  echo "WARNING: pattern found in git history -- inspect manually, this script does not distinguish real keys from library code in history"
  LEAK=1
fi
if [ "$LEAK" -eq 0 ]; then
  echo "no plaintext key material found"
  record PASS "Gate 4: No plaintext key in logs/configs"
else
  record FAIL "Gate 4: No plaintext key in logs/configs"
fi
echo

echo "== Gate 5: Backup verification =="
echo "SKIP: cannot be verified from this machine -- no Supabase dashboard/API access from here."
echo "This project is on Supabase's free tier per docs/HANDOFF_RUNBOOK.md, which does not"
echo "include automated backups/PITR by default. Confirm manually: Supabase Dashboard ->"
echo "Project Settings -> Database -> Backups. A manual pre-drop export can be produced"
echo "separately (see scripts/migrate-signing-key-to-vault.ts's pattern for reading the key)."
record SKIP "Gate 5: Backup verification (manual check required)"
echo

echo "================= SUMMARY ================="
for r in "${RESULTS[@]}"; do
  status="${r%%|*}"
  name="${r#*|}"
  case "$status" in
    PASS) echo "✅ PASS  $name" ;;
    FAIL) echo "❌ FAIL  $name" ;;
    SKIP) echo "⚠️  SKIP  $name" ;;
  esac
done
echo "============================================="
echo "PASS=$PASS FAIL=$FAIL SKIP=$SKIP"

if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: BLOCKED -- do not drop privateKeyPem until failures are resolved."
  exit 1
fi
if [ "$SKIP" -gt 0 ]; then
  echo "RESULT: gates that could be checked all passed, but $SKIP gate(s) need manual sign-off (see SKIP reasons above)."
  exit 2
fi
echo "RESULT: all gates passed."
exit 0
