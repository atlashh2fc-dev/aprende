import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlayCircle, FileText, HelpCircle, Clock, BarChart3, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EnrollButton } from "@/components/EnrollButton";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, Leccion } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const TIPO_ICON = { video: PlayCircle, texto: FileText, quiz: HelpCircle } as const;

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

  const [{ data: leccionesRaw }, { data: insRaw }] = await Promise.all([
    supabase.from("lecciones").select("id, titulo, tipo, duracion_min, orden").eq("curso_id", curso.id).order("orden"),
    supabase.from("inscripciones").select("id").eq("curso_id", curso.id).eq("alumno_id", user.id).maybeSingle(),
  ]);
  const lecciones = (leccionesRaw as Pick<Leccion, "id" | "titulo" | "tipo" | "duracion_min" | "orden">[] | null) ?? [];
  const inscrito = !!insRaw;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/explorar" className="text-xs" style={{ color: "var(--text-faint)" }}>← Volver al catálogo</Link>

        <div className="mt-4 overflow-hidden rounded-2xl"
          style={{ background: curso.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), color-mix(in srgb, var(--accent) 18%, transparent))", aspectRatio: "21/9" }}>
          {curso.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={curso.imagen_url} alt={curso.titulo} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-xl">
            {curso.categoria && <span className="eyebrow" style={{ color: "var(--primary-light)" }}>{curso.categoria}</span>}
            <h1 className="mt-2 font-serif-brand" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.05 }}>
              {curso.titulo}
            </h1>
            <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--text-faint)" }}>
              {curso.nivel && <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {curso.nivel}</span>}
              {!!curso.duracion_horas && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {curso.duracion_horas} h</span>}
              <span>{lecciones.length} lecciones</span>
            </div>
          </div>
          <div>
            {inscrito ? (
              <span className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold"
                style={{ background: "var(--primary-dim)", color: "var(--primary-light)" }}>
                <CheckCircle2 className="h-4 w-4" /> Inscrito
              </span>
            ) : (
              <EnrollButton cursoId={curso.id} />
            )}
          </div>
        </div>

        {curso.descripcion && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {curso.descripcion}
          </p>
        )}

        <h2 className="mt-10 mb-4 font-serif-brand text-xl font-bold" style={{ color: "var(--text)" }}>Contenido</h2>
        <div className="flex flex-col gap-2">
          {lecciones.length === 0 && (
            <p className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Este curso aún no tiene lecciones.</p>
          )}
          {lecciones.map((l, i) => {
            const Icon = TIPO_ICON[l.tipo] ?? FileText;
            const row = (
              <div className="card flex items-center gap-4 px-5 py-4">
                <span className="text-xs font-bold tabular-nums" style={{ color: "var(--text-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
                <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--primary-light)" }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--text)" }}>{l.titulo}</span>
                {!!l.duracion_min && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{l.duracion_min} min</span>}
              </div>
            );
            return inscrito
              ? <Link key={l.id} href={`/aprender/${l.id}`}>{row}</Link>
              : <div key={l.id} style={{ opacity: 0.7 }}>{row}</div>;
          })}
        </div>
      </div>
    </AppShell>
  );
}
