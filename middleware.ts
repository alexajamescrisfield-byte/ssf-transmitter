import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything EXCEPT: Next.js internals/static assets, and the ISC-facing
    // protocol endpoints under /t/{slug}/... (those authenticate via bearer
    // token, not a login session -- see lib/supabase/middleware.ts).
    "/((?!_next/static|_next/image|favicon.ico|t/).*)",
  ],
};
