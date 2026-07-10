import { Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ManagePlaceholder } from "@/components/ManagePlaceholder";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SupervisorPage() {
  const user = await requireRole(["supervisor", "admin"], "/supervisor");
  return (
    <AppShell user={user}>
      <ManagePlaceholder
        icon={Users}
        eyebrow="Supervisor"
        titulo="Mi institución"
        desc="Vista acotada a tu institución: avance de alumnos y cursos de tu cohorte, en modo supervisión."
        bullets={[
          "Listado de alumnos de la institución y su progreso.",
          "Cursos de la institución y tasa de finalización.",
          "Reportes de engagement por cohorte (solo lectura).",
          "Asignación de alumnos a cursos de la institución.",
        ]}
      />
    </AppShell>
  );
}
