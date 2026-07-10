import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

// Rutas que exigen sesión iniciada. El rol específico (admin/supervisor/profesor)
// se hace cumplir en el servidor con getSessionUser(), que lee profiles.rol
// (fuente de verdad), evitando depender de que el rol viaje en el JWT.
const PROTECTED = ["/dashboard", "/mis-cursos", "/explorar", "/cursos", "/admin", "/profesor", "/supervisor", "/aprender"];

function normalize(pathname: string) {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export async function middleware(req: NextRequest) {
  const pathname = normalize(req.nextUrl.pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  const { supabaseResponse, user } = await updateSupabaseSession(req);

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
