import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO_EMAIL = "admin.demo@aprende.dev";

async function validateTicket(ticket: string) {
  const response = await fetch("https://www.geimser.cl/api/experience/demo-ticket", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "learning", ticket }),
  });
  return response.ok;
}

export async function POST(request: NextRequest) {
  const { ticket } = await request.json().catch(() => ({ ticket: "" }));
  if (!ticket || !(await validateTicket(String(ticket)))) {
    return NextResponse.json({ error: "Acceso demo expirado." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createAdminClient();
  if (!url || !key || !admin) {
    return NextResponse.json({ error: "El demo no está configurado." }, { status: 503 });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.json({ error: "La cuenta demo no está disponible." }, { status: 503 });
  }

  const response = NextResponse.json({ redirect: "/dashboard?demo=1" });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, {
          ...options,
          sameSite: "none",
          secure: true,
          partitioned: true,
        }));
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) return NextResponse.json({ error: "No fue posible crear la sesión demo." }, { status: 503 });

  response.cookies.set("geimser-demo-embed", "1", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    partitioned: true,
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
