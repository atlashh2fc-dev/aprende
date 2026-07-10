/**
 * Helpers de sesión para Server Components / Route Handlers.
 */
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/supabase/database.types";

export interface SessionUser {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatar_url: string | null;
  rol: UserRole;
  institucion_id: string | null;
}

/**
 * Devuelve el usuario autenticado + su perfil, combinando la fila de `profiles`
 * con los metadatos del SSO (Google) como respaldo para nombre y avatar.
 * Retorna null si no hay sesión o Supabase no está configurado.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("nombre, apellido, avatar_url, rol, institucion_id")
    .eq("id", user.id)
    .single();
  const profile = data as Pick<Profile, "nombre" | "apellido" | "avatar_url" | "rol" | "institucion_id"> | null;

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const full = (meta.full_name || meta.name || "").trim();
  const given = (meta.given_name || (full ? full.split(" ")[0] : "")).trim();
  const family = (meta.family_name || (full.split(" ").length > 1 ? full.split(" ").slice(1).join(" ") : "")).trim();

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: profile?.nombre || given || null,
    apellido: profile?.apellido || family || null,
    avatar_url: profile?.avatar_url || meta.avatar_url || meta.picture || null,
    rol: profile?.rol ?? "alumno",
    institucion_id: profile?.institucion_id ?? null,
  };
}

import { redirect } from "next/navigation";

/**
 * Exige sesión + uno de los roles permitidos. Redirige a /login si no hay
 * sesión, o a /dashboard si el rol no está autorizado. Devuelve el usuario.
 */
export async function requireRole(allowed: UserRole[], redirectTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  if (!allowed.includes(user.rol)) redirect("/dashboard");
  return user;
}

export function initials(nombre: string | null, apellido: string | null, email: string): string {
  const fromName = [nombre, apellido].filter(Boolean).map((n) => n![0]!.toUpperCase()).join("").slice(0, 2);
  return fromName || email.slice(0, 2).toUpperCase() || "AL";
}

export function displayName(u: { nombre: string | null; email: string }): string {
  return u.nombre ?? u.email.split("@")[0];
}
