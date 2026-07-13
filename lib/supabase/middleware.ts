/**
 * Supabase · helper de middleware. Refresca la sesión en cada request para que
 * los Server Components reciban un access_token válido.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const embeddedDemo = request.cookies.get("geimser-demo-embed")?.value === "1";

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, {
            ...(options as Parameters<typeof supabaseResponse.cookies.set>[2]),
            ...(embeddedDemo ? { sameSite: "none" as const, secure: true, partitioned: true } : {}),
          }));
        },
      },
    }
  );

  // No añadir lógica entre createServerClient y getUser().
  const { data: { user } } = await supabase.auth.getUser();
  return { supabaseResponse, user };
}
