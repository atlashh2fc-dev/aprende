import Link from "next/link";
import { BookOpen, Plus, ArrowRight, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, CursoEstado } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const ESTADO_STYLE: Record<CursoEstado, { label: string; bg: string; color: string }> = {
  publicado: { label: "Publicado", bg: "var(--accent-dim)", color: "var(--accent)" },
  borrador: { label: "Borrador", bg: "var(--surface-2)", color: "var(--text-muted)" },
  archivado: { label: "Archivado", bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
};

export default async function AdminCursosPage() {
  const user = await requireRole(["admin"], "/admin/cursos");
  const supabase = await createClient();

  let cursos: Pick<Curso, "id" | "slug" | "titulo" | "categoria" | "nivel" | "estado" | "duracion_horas">[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("cursos")
      .select("id, slug, titulo, categoria, nivel, estado, duracion_horas")
      .order("created_at", { ascending: false });
    cursos = (data as typeof cursos | null) ?? [];
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p>
            <SectionTitle>Cursos</SectionTitle>
          </div>
          <Link href="/admin/cursos/nuevo"
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-3 text-xs">
            <Plus className="h-4 w-4" /> Nuevo curso
          </Link>
        </div>

        {cursos.length === 0 ? (
          <div className="card animate-rise rise-2 p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8" style={{ color: "var(--text-faint)" }} />
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Todavía no hay cursos. Crea el primero.
            </p>
            <Link href="/admin/cursos/nuevo"
              className="btn-ghost mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs">
              <Plus className="h-4 w-4" /> Nuevo curso
            </Link>
          </div>
        ) : (
          <div className="card animate-rise rise-2 divide-y overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {cursos.map((c) => {
              const est = ESTADO_STYLE[c.estado];
              return (
                <Link key={c.id} href={`/admin/cursos/${c.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[color:var(--surface-2)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))", color: "var(--primary)" }}>
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</p>
                    <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                      {[c.categoria, c.nivel, c.duracion_horas ? `${c.duracion_horas} h` : null].filter(Boolean).join(" · ") || "Sin detalles"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider"
                    style={{ background: est.bg, color: est.color }}>
                    {est.label}
                  </span>
                  <Pencil className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: "var(--text-faint)" }} />
                  <ArrowRight className="arrow-slide h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
