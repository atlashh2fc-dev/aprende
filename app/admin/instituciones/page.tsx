import { Building2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ManagePlaceholder } from "@/components/ManagePlaceholder";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminInstitucionesPage() {
  const user = await requireRole(["admin"], "/admin/instituciones");
  return (
    <AppShell user={user}>
      <ManagePlaceholder
        icon={Building2}
        eyebrow="Administración"
        titulo="Instituciones"
        desc="Crea instituciones (cohortes) y asigna supervisores que las gestionan de forma acotada."
        bullets={[
          "Crear y editar instituciones (nombre, slug, logo).",
          "Asignar supervisores y profesores a cada institución.",
          "Vincular cursos a una institución.",
          "Ver resumen de alumnos y avance por institución.",
        ]}
      />
    </AppShell>
  );
}
