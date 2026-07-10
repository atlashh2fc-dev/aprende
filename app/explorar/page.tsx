import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, BarChart3 } from "lucide-react";
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

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mb-8">
          <p className="eyebrow" style={{ color: "var(--text-faint)" }}>Catálogo</p>
          <SectionTitle>Cursos disponibles</SectionTitle>
        </div>

        {cursos.length === 0 ? (
          <p className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Aún no hay cursos publicados.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => (
              <Link key={c.id} href={`/cursos/${c.slug}`} className="card-glass group flex flex-col overflow-hidden">
                <div className="aspect-[16/9] w-full overflow-hidden"
                  style={{ background: c.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), color-mix(in srgb, var(--accent) 18%, transparent))" }}>
                  {c.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {c.categoria && <span className="eyebrow mb-1.5" style={{ color: "var(--primary-light)" }}>{c.categoria}</span>}
                  <h3 className="font-serif-brand text-lg font-semibold leading-snug" style={{ color: "var(--text)" }}>{c.titulo}</h3>
                  {c.descripcion_corta && (
                    <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-muted)" }}>{c.descripcion_corta}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 pt-4 text-xs" style={{ color: "var(--text-faint)" }}>
                    {c.nivel && <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {c.nivel}</span>}
                    {!!c.duracion_horas && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.duracion_horas} h</span>}
                    <span className="ml-auto flex items-center gap-1" style={{ color: "var(--primary-light)" }}>
                      Ver <ArrowRight className="h-3.5 w-3.5" />
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
