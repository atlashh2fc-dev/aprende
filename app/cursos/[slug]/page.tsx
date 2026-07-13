import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  PlayCircle, FileText, HelpCircle, Clock, BarChart3, CheckCircle2,
  ArrowLeft, Layers, Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EnrollButton } from "@/components/EnrollButton";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, Leccion, Modulo } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const TIPO_ICON = { video: PlayCircle, texto: FileText, quiz: HelpCircle } as const;
const TIPO_LABEL = { video: "Video", texto: "Lectura", quiz: "Quiz" } as const;

export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/cursos/${slug}`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: cursoRaw } = await supabase
    .from("cursos")
    .select("id, slug, titulo, descripcion, descripcion_corta, imagen_url, nivel, duracion_horas, categoria")
    .eq("slug", slug)
    .single();
  const curso = cursoRaw as Pick<Curso, "id" | "slug" | "titulo" | "descripcion" | "descripcion_corta" | "imagen_url" | "nivel" | "duracion_horas" | "categoria"> | null;
  if (!curso) notFound();

  const [{ data: leccionesRaw }, { data: modulosRaw }, { data: insRaw }, { data: progresoRaw }] = await Promise.all([
    supabase.from("lecciones").select("id, titulo, tipo, duracion_min, orden, modulo_id").eq("curso_id", curso.id).order("orden"),
    supabase.from("modulos").select("id, titulo, orden").eq("curso_id", curso.id).order("orden"),
    supabase.from("inscripciones").select("id").eq("curso_id", curso.id).eq("alumno_id", user.id).maybeSingle(),
    supabase.from("progreso_lecciones").select("leccion_id, completada").eq("curso_id", curso.id).eq("alumno_id", user.id),
  ]);
  const lecciones = (leccionesRaw as Pick<Leccion, "id" | "titulo" | "tipo" | "duracion_min" | "orden" | "modulo_id">[] | null) ?? [];
  const modulos = (modulosRaw as Pick<Modulo, "id" | "titulo" | "orden">[] | null) ?? [];
  const inscrito = !!insRaw;
  const totalMin = lecciones.reduce((acc, l) => acc + (l.duracion_min ?? 0), 0);
  const completadas = new Set(
    ((progresoRaw as { leccion_id: string; completada: boolean }[] | null) ?? [])
      .filter((p) => p.completada)
      .map((p) => p.leccion_id),
  );
  const avance = lecciones.length ? Math.round((completadas.size / lecciones.length) * 100) : 0;
  const siguientePendiente = lecciones.find((leccion) => !completadas.has(leccion.id)) ?? lecciones[0];
  const bloques = [
    ...modulos.map((modulo) => ({
      id: modulo.id,
      titulo: modulo.titulo,
      lecciones: lecciones.filter((leccion) => leccion.modulo_id === modulo.id),
    })).filter((bloque) => bloque.lecciones.length),
    ...(lecciones.some((leccion) => !leccion.modulo_id)
      ? [{ id: "sin-modulo", titulo: modulos.length ? "Contenido adicional" : "Contenido del curso", lecciones: lecciones.filter((leccion) => !leccion.modulo_id) }]
      : []),
  ];

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/explorar"
          className="group inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Volver al catálogo
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Columna principal */}
          <div className="animate-rise min-w-0">
            <div className="overflow-hidden rounded-2xl"
              style={{
                background: curso.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))",
                aspectRatio: "21/9",
                boxShadow: "var(--shadow-md)",
              }}>
              {curso.imagen_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={curso.imagen_url} alt={curso.titulo} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="mt-6">
              {curso.categoria && (
                <span className="badge rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider">
                  {curso.categoria}
                </span>
              )}
              <h1 className="mt-3 font-serif-brand tracking-tight"
                style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.05 }}>
                {curso.titulo}
              </h1>
            </div>

            {curso.descripcion && (
              <p className="mt-5 whitespace-pre-line text-[0.95rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {curso.descripcion}
              </p>
            )}

            <h2 className="mt-10 mb-4 flex items-center gap-2 font-serif-brand text-xl font-bold" style={{ color: "var(--text)" }}>
              <Layers className="h-5 w-5" style={{ color: "var(--primary)" }} /> Contenido del curso
            </h2>
            <div className="flex flex-col gap-6">
              {lecciones.length === 0 && (
                <p className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Este curso aún no tiene lecciones.
                </p>
              )}
              {bloques.map((bloque, bloqueIndex) => (
                <section key={bloque.id} aria-labelledby={`modulo-${bloque.id}`}>
                  {(bloques.length > 1 || modulos.length > 0) && (
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                      <h3 id={`modulo-${bloque.id}`} className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        <span style={{ color: "var(--primary)" }}>{String(bloqueIndex + 1).padStart(2, "0")}</span> · {bloque.titulo}
                      </h3>
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>{bloque.lecciones.length} lecciones</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                  {bloque.lecciones.map((l) => {
                const Icon = TIPO_ICON[l.tipo] ?? FileText;
                const i = lecciones.findIndex((leccion) => leccion.id === l.id);
                const row = (
                  <div className={`card flex items-center gap-4 px-5 py-4 ${inscrito ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]" : ""}`}>
                    <span className="text-xs font-bold tabular-nums" style={{ color: "var(--text-faint)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>{l.titulo}</span>
                      <span className="text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                        {TIPO_LABEL[l.tipo] ?? "Lección"}
                      </span>
                    </div>
                    {completadas.has(l.id) && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />}
                    {!!l.duracion_min && (
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>{l.duracion_min} min</span>
                    )}
                    {!inscrito && <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-faint)" }} />}
                  </div>
                );
                return inscrito
                  ? <Link key={l.id} href={`/aprender/${l.id}`}>{row}</Link>
                  : <div key={l.id} style={{ opacity: 0.72 }}>{row}</div>;
                  })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Tarjeta lateral de inscripción */}
          <aside className="animate-rise rise-2">
            <div className="card sticky top-24 p-6" style={{ boxShadow: "var(--shadow-md)" }}>
              <p className="eyebrow" style={{ color: "var(--text-faint)" }}>Este curso incluye</p>
              <ul className="mt-4 flex flex-col gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
                <li className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                  {lecciones.length} lecciones
                </li>
                {modulos.length > 0 && (
                  <li className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                    {modulos.length} {modulos.length === 1 ? "módulo" : "módulos"}
                  </li>
                )}
                {totalMin > 0 && (
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                    {totalMin >= 60 ? `${Math.round(totalMin / 60)} h de contenido` : `${totalMin} min de contenido`}
                  </li>
                )}
                {!totalMin && !!curso.duracion_horas && (
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                    {curso.duracion_horas} h de contenido
                  </li>
                )}
                {curso.nivel && (
                  <li className="flex items-center gap-2.5">
                    <BarChart3 className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                    Nivel {curso.nivel}
                  </li>
                )}
              </ul>
              <div className="mt-6 border-t pt-6" style={{ borderColor: "var(--border)" }}>
                {inscrito ? (
                  <div className="flex flex-col gap-3">
                    {lecciones.length > 0 && (
                      <div>
                        <div className="mb-1.5 flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
                          <span>Tu avance</span><span className="tabular-nums">{avance}%</span>
                        </div>
                        <div className="progress-track h-1.5"><div className="progress-bar h-full" style={{ width: `${avance}%` }} /></div>
                      </div>
                    )}
                    <span className="badge-accent inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Ya estás inscrito
                    </span>
                    {siguientePendiente && (
                      <Link href={`/aprender/${siguientePendiente.id}`}
                        className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-xs">
                        <PlayCircle className="h-4 w-4" /> {avance === 100 ? "Repasar el curso" : "Continuar aprendiendo"}
                      </Link>
                    )}
                  </div>
                ) : (
                  <EnrollButton cursoId={curso.id} />
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
