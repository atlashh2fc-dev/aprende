import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ManagePlaceholder } from "@/components/ManagePlaceholder";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfesorCursosPage() {
  const user = await requireRole(["profesor", "admin"], "/profesor/cursos");
  return (
    <AppShell user={user}>
      <ManagePlaceholder
        icon={BookOpen}
        eyebrow="Profesor"
        titulo="Gestión de cursos"
        desc="Crea y edita tus cursos, sube clases (video/texto) y arma quizzes por lección."
        bullets={[
          "Crear curso: título, descripción, portada, nivel y categoría.",
          "Módulos y lecciones ordenables (video, texto o quiz).",
          "Editor de quizzes con preguntas de opción única o múltiple.",
          "Publicar / despublicar y ver alumnos inscritos.",
        ]}
      />
    </AppShell>
  );
}
