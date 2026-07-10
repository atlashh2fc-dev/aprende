import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ManagePlaceholder } from "@/components/ManagePlaceholder";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCursosPage() {
  const user = await requireRole(["admin"], "/admin/cursos");
  return (
    <AppShell user={user}>
      <ManagePlaceholder
        icon={BookOpen}
        eyebrow="Administración"
        titulo="Cursos"
        desc="Vista global de todos los cursos de la plataforma, con control de estado y asignación."
        bullets={[
          "Todos los cursos (borrador, publicado, archivado).",
          "Asignar profesor e institución a cada curso.",
          "Publicar, archivar o eliminar en lote.",
          "Métricas por curso (inscritos, finalización).",
        ]}
      />
    </AppShell>
  );
}
