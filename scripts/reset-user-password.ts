// Updates an existing Supabase Auth account's password directly. Run
// locally only, same as add-user.ts -- uses the service_role key, never
// bundled into the deployed app.
//
// Usage: npx tsx --env-file=.env scripts/reset-user-password.ts <email> <newPassword>
import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error(
      "Usage: npx tsx --env-file=.env scripts/reset-user-password.ts <email> <newPassword>",
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  const user = data.users.find((u) => u.email === email);
  if (!user) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateErr) throw updateErr;

  console.log(`Password updated for ${email}. They can sign in with the new password now.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
