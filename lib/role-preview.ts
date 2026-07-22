/**
 * Vista previa de roles para administradores.
 *
 * Esta preferencia solo cambia la interfaz que se renderiza. Las validaciones
 * de páginas, RLS y APIs siempre continúan usando el rol real del perfil.
 */
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/supabase/database.types";

export const ROLE_PREVIEW_COOKIE = "aprende_role_preview";
export const PREVIEWABLE_ROLES: UserRole[] = ["alumno", "profesor", "supervisor", "admin"];

export async function readRolePreview(realRole: UserRole): Promise<UserRole | null> {
  if (realRole !== "admin") return null;

  const value = (await cookies()).get(ROLE_PREVIEW_COOKIE)?.value;
  return value && PREVIEWABLE_ROLES.includes(value as UserRole) ? value as UserRole : null;
}

export function effectiveRole(realRole: UserRole, previewRole: UserRole | null): UserRole {
  return realRole === "admin" && previewRole ? previewRole : realRole;
}
