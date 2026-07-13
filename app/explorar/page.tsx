import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { CourseCatalog, type CatalogCourse } from "@/components/CourseCatalog";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function ExplorarPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/explorar");
  const supabase = await createClient();

  let cursos: Pick<Curso, "id" | "slug" | "titulo" | "descripcion_corta" | "imagen_url" | "nivel" | "duracion_horas" | "categoria">[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("cursos")
      .select("id, slug, titulo, descripcion_corta, imagen_url, nivel, duracion_horas, categoria")
      .eq("estado", "publicado")
      .order("created_at", { ascending: false });
    cursos = (data as typeof cursos | null) ?? [];
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Catálogo</p>
          <SectionTitle>Encuentra una habilidad para desarrollar</SectionTitle>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Explora contenidos diseñados para aplicar lo aprendido en el trabajo, no solo para consumirlos.
          </p>
        </div>

        {cursos.length === 0 ? (
          <div className="card animate-rise rise-2 p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8" style={{ color: "var(--text-faint)" }} />
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Aún no hay cursos publicados.
            </p>
          </div>
        ) : (
          <CourseCatalog courses={cursos as CatalogCourse[]} />
        )}
      </div>
    </AppShell>
  );
}
