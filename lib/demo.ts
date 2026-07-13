/**
 * Modo demo "Ver como": permite a un admin previsualizar la app con el rol de
 * otro perfil (alumno/profesor/supervisor) sin cambiar su rol real. Se guarda en
 * una cookie que leen los Server Components. Solo aplica si el rol real es admin.
 */
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/supabase/database.types";

export const DEMO_COOKIE = "aprende_demo_role";
const VALID: UserRole[] = ["alumno", "profesor", "supervisor", "admin"];

export async function readDemoRole(): Promise<UserRole | null> {
  const v = (await cookies()).get(DEMO_COOKIE)?.value;
  return v && VALID.includes(v as UserRole) ? (v as UserRole) : null;
}

export function effectiveRole(realRole: UserRole, demo: UserRole | null): UserRole {
  return realRole === "admin" && demo ? demo : realRole;
}
