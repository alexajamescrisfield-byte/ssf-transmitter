// Creates one Supabase Auth account directly -- no public sign-up page
// exists, this is the only way to provision access. Run locally only:
// never deployed, never given a way to be called remotely.
//
// Usage: npx tsx --env-file=.env scripts/add-user.ts <email> <password>
import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx --env-file=.env scripts/add-user.ts <email> <password>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env " +
        "(the service_role key is never used by the deployed app itself -- only here, locally).",
    );
  }

  // service_role bypasses all access rules -- admin.createUser() is the
  // only thing this script does with it.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification -- these are manually-vetted accounts, not self-signups
  });

  if (error) {
    console.error("Failed to create user:", error.message);
    process.exit(1);
  }

  console.log(`Created user: ${data.user?.email} (${data.user?.id})`);
  console.log("They can now sign in at /login with the password you set.");
}

main();
