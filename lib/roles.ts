import type { UserRole } from "@/lib/supabase/database.types";

export const ROLE_LABEL: Record<UserRole, string> = {
  alumno: "Alumno",
  profesor: "Profesor",
  supervisor: "Supervisor",
  admin: "Administrador",
};

/** Rutas de Academia que requieren un rol específico (además de estar autenticado). */
export const ROLE_HOME: Record<UserRole, string> = {
  alumno: "/dashboard",
  profesor: "/dashboard",
  supervisor: "/dashboard",
  admin: "/dashboard",
};
