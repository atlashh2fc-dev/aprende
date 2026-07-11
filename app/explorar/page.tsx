import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, BarChart3, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
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

  const categorias = [...new Set(cursos.map((c) => c.categoria).filter(Boolean))] as string[];

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Catálogo</p>
          <SectionTitle>Cursos disponibles</SectionTitle>
          {categorias.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <span key={cat} className="chip rounded-full px-3.5 py-1.5 text-xs font-semibold">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {cursos.length === 0 ? (
          <div className="card animate-rise rise-2 p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8" style={{ color: "var(--text-faint)" }} />
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Aún no hay cursos publicados.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c, i) => (
              <Link key={c.id} href={`/cursos/${c.slug}`}
                className={`card-glass group animate-rise rise-${(i % 5) + 1} flex flex-col overflow-hidden`}>
                <div className="aspect-[16/9] w-full overflow-hidden"
                  style={{ background: c.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))" }}>
                  {c.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {c.categoria && (
                    <span className="badge mb-2 w-fit rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider">
                      {c.categoria}
                    </span>
                  )}
                  <h3 className="font-serif-brand text-lg font-semibold leading-snug" style={{ color: "var(--text)" }}>
                    {c.titulo}
                  </h3>
                  {c.descripcion_corta && (
                    <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-muted)" }}>{c.descripcion_corta}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 pt-4 text-xs" style={{ color: "var(--text-faint)" }}>
                    {c.nivel && <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {c.nivel}</span>}
                    {!!c.duracion_horas && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.duracion_horas} h</span>}
                    <span className="ml-auto flex items-center gap-1 font-semibold" style={{ color: "var(--primary)" }}>
                      Ver curso <ArrowRight className="arrow-slide h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
