/**
 * Supabase · cliente de servidor (Server Components, Route Handlers, Server Actions).
 * Retorna null si faltan las variables de entorno, para no crashear en desarrollo.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...(options as Parameters<typeof cookieStore.set>[2]),
              })
            );
          } catch {
            // setAll puede lanzar en Server Components de solo lectura.
          }
        },
      },
    }
  );
}
