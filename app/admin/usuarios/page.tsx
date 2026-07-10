import { Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ManagePlaceholder } from "@/components/ManagePlaceholder";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const user = await requireRole(["admin"], "/admin/usuarios");
  return (
    <AppShell user={user}>
      <ManagePlaceholder
        icon={Users}
        eyebrow="Administración"
        titulo="Usuarios"
        desc="Gestiona roles y pertenencia a instituciones de todas las cuentas."
        bullets={[
          "Buscar usuarios y cambiar su rol (alumno/profesor/supervisor/admin).",
          "Asignar usuarios a una institución.",
          "Invitar por correo y revocar accesos.",
          "Ver actividad y última conexión.",
        ]}
      />
    </AppShell>
  );
}
