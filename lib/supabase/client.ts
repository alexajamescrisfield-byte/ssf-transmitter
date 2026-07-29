import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client -- used only by client components (the
// login form, the sidebar's sign-out button). Only ever uses the public
// anon key, safe to ship to the browser by design.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
