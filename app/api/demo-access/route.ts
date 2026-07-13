import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO_EMAIL = "admin.demo@aprende.dev";

async function ensureDemoUser(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  let user;
  for (let page = 1; page <= 20 && !user; page += 1) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) throw listError;
    user = listed.users.find((candidate) => candidate.email?.toLowerCase() === DEMO_EMAIL);
    if (listed.users.length < 1000) break;
  }
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "Demo Comercial Geimser" },
    });
    if (error || !data.user) throw error ?? new Error("No fue posible crear la cuenta demo.");
    user = data.user;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    email: DEMO_EMAIL,
    nombre: "Demo Comercial",
    apellido: "Geimser",
    rol: "admin",
  } as never, { onConflict: "id" });
  if (profileError) throw profileError;
  return user.id;
}

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

  const demoPassword = randomBytes(32).toString("base64url");
  try {
    const userId = await ensureDemoUser(admin);
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, {
      password: demoPassword,
      email_confirm: true,
    });
    if (passwordError) throw passwordError;
  } catch {
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

  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: demoPassword });
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
