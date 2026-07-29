import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client (Server Components, Route Handlers, layouts).
// Reads/writes the session via Next.js's cookie store. Only ever uses the
// public anon key -- the service_role key is never used here, only in
// scripts/add-user.ts, which runs locally and never ships with the app.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies directly
            // -- middleware.ts is what actually refreshes the session in
            // that case, so this is safe to ignore.
          }
        },
      },
    },
  );
}
