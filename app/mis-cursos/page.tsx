import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MisCursosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/mis-cursos");
  const supabase = await createClient();

  let cursos: { id: string; slug: string; titulo: string; imagen_url: string | null; estado: string; avance: number }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("inscripciones")
      .select("estado, cursos(id, slug, titulo, imagen_url)")
      .eq("alumno_id", user.id)
      .order("fecha_inscripcion", { ascending: false });
    const rows = (data as unknown as { estado: string; cursos: { id: string; slug: string; titulo: string; imagen_url: string | null } | null }[] | null) ?? [];
    const base = rows.filter((r) => r.cursos).map((r) => ({ ...r.cursos!, estado: r.estado }));

    // Avance por curso = lecciones completadas / total de lecciones.
    const ids = base.map((c) => c.id);
    const totalPorCurso = new Map<string, number>();
    const hechasPorCurso = new Map<string, number>();
    if (ids.length) {
      const [{ data: lec }, { data: prog }] = await Promise.all([
        supabase.from("lecciones").select("curso_id").in("curso_id", ids),
        supabase.from("progreso_lecciones").select("curso_id, completada").eq("alumno_id", user.id).in("curso_id", ids),
      ]);
      ((lec as { curso_id: string }[] | null) ?? []).forEach((l) => totalPorCurso.set(l.curso_id, (totalPorCurso.get(l.curso_id) ?? 0) + 1));
      ((prog as { curso_id: string; completada: boolean }[] | null) ?? []).forEach((p) => {
        if (p.completada) hechasPorCurso.set(p.curso_id, (hechasPorCurso.get(p.curso_id) ?? 0) + 1);
      });
    }
    cursos = base.map((c) => {
      const total = totalPorCurso.get(c.id) ?? 0;
      const hechas = hechasPorCurso.get(c.id) ?? 0;
      return { ...c, avance: total > 0 ? Math.round((hechas / total) * 100) : 0 };
    });
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Tu aprendizaje</p>
          <SectionTitle>Mis cursos</SectionTitle>
        </div>
        {cursos.length === 0 ? (
          <div className="card animate-rise rise-2 p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8" style={{ color: "var(--text-faint)" }} />
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Aún no estás inscrito en ningún curso.
            </p>
            <Link href="/explorar"
              className="btn-primary group mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-xs">
              Explorar cursos <ArrowRight className="arrow-slide h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c, i) => (
              <Link key={c.slug} href={`/cursos/${c.slug}`}
                className={`card-glass group animate-rise rise-${(i % 5) + 1} overflow-hidden`}>
                <div className="aspect-[16/9] overflow-hidden"
                  style={{ background: c.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))" }}>
                  {c.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="line-clamp-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</h4>
                    <span className={`${c.estado === "completada" ? "badge-accent" : "badge"} shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize`}>
                      {c.estado}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[0.7rem]" style={{ color: "var(--text-faint)" }}>
                      <span>Avance</span><span className="tabular-nums">{c.avance}%</span>
                    </div>
                    <div className="progress-track h-1.5 w-full">
                      <div className="progress-bar h-full" style={{ width: `${c.avance}%` }} />
                    </div>
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
