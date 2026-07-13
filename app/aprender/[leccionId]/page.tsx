import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, PlayCircle, FileText, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ContentRenderer } from "@/components/ContentRenderer";
import { QuizTaker } from "@/components/QuizTaker";
import { MarcarCompletada } from "@/components/MarcarCompletada";
import { TutorChat } from "@/components/TutorChat";
import { CertificadoButton } from "@/components/CertificadoButton";
import { LessonNotes } from "@/components/LessonNotes";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Leccion, Curso, Quiz, QuizPregunta, QuizOpcion } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const TIPO_META = {
  video: { icon: PlayCircle, label: "Lección" },
  texto: { icon: FileText, label: "Lectura" },
  quiz: { icon: HelpCircle, label: "Evaluación" },
} as const;

export default async function LeccionPage({ params }: { params: Promise<{ leccionId: string }> }) {
  const { leccionId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/aprender/${leccionId}`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: leccionRaw } = await supabase
    .from("lecciones")
    .select("id, curso_id, titulo, tipo, contenido, video_url, orden")
    .eq("id", leccionId)
    .single();
  const leccion = leccionRaw as Pick<Leccion, "id" | "curso_id" | "titulo" | "tipo" | "contenido" | "video_url" | "orden"> | null;
  if (!leccion) notFound();

  const [{ data: cursoRaw }, { data: hermanasRaw }] = await Promise.all([
    supabase.from("cursos").select("slug, titulo").eq("id", leccion.curso_id).single(),
    supabase.from("lecciones").select("id, titulo, orden").eq("curso_id", leccion.curso_id).order("orden"),
  ]);
  const curso = cursoRaw as Pick<Curso, "slug" | "titulo"> | null;
  const hermanas = (hermanasRaw as Pick<Leccion, "id" | "titulo" | "orden">[] | null) ?? [];
  const idx = hermanas.findIndex((l) => l.id === leccion.id);
  const anterior = idx > 0 ? hermanas[idx - 1] : null;
  const siguiente = idx >= 0 && idx < hermanas.length - 1 ? hermanas[idx + 1] : null;

  // Progreso real: lecciones completadas por el alumno en este curso.
  const [{ data: progRaw }, { data: noteRaw }] = await Promise.all([
    supabase
      .from("progreso_lecciones")
      .select("leccion_id, completada")
      .eq("alumno_id", user.id)
      .eq("curso_id", leccion.curso_id),
    supabase
      .from("notas_leccion")
      .select("contenido")
      .eq("alumno_id", user.id)
      .eq("leccion_id", leccion.id)
      .maybeSingle(),
  ]);
  const progRows = (progRaw as { leccion_id: string; completada: boolean }[] | null) ?? [];
  const completadas = new Set(progRows.filter((p) => p.completada).map((p) => p.leccion_id));
  const estaCompletada = completadas.has(leccion.id);
  const progreso = hermanas.length > 0 ? Math.round((completadas.size / hermanas.length) * 100) : 0;
  const initialNote = (noteRaw as { contenido: string } | null)?.contenido ?? "";

  // Quiz (si la lección es de tipo quiz). Se seleccionan opciones SIN es_correcta.
  let quiz: {
    id: string;
    titulo: string;
    fechaLimite: string | null;
    intentosMaximos: number | null;
    intentosUsados: number;
    feedbackDocente: string | null;
    preguntas: { id: string; enunciado: string; tipo: "unica" | "multiple"; opciones: { id: string; texto: string }[] }[];
  } | null = null;
  if (leccion.tipo === "quiz") {
    const { data: qRaw } = await supabase
      .from("quizzes")
      .select("id, titulo, fecha_limite, intentos_maximos")
      .eq("leccion_id", leccion.id)
      .maybeSingle();
    const q = qRaw as Pick<Quiz, "id" | "titulo" | "fecha_limite" | "intentos_maximos"> | null;
    if (q) {
      const { data: pRaw } = await supabase.from("quiz_preguntas").select("id, enunciado, tipo, orden").eq("quiz_id", q.id).order("orden");
      const preguntas = (pRaw as Pick<QuizPregunta, "id" | "enunciado" | "tipo" | "orden">[] | null) ?? [];
      const { data: oRaw } = await supabase.from("quiz_opciones").select("id, pregunta_id, texto, orden")
        .in("pregunta_id", preguntas.map((p) => p.id)).order("orden");
      const opciones = (oRaw as Pick<QuizOpcion, "id" | "pregunta_id" | "texto" | "orden">[] | null) ?? [];
      const { data: intentosRaw, count } = await supabase
        .from("quiz_intentos")
        .select("feedback_docente, created_at", { count: "exact" })
        .eq("quiz_id", q.id)
        .eq("alumno_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const ultimoIntento = (intentosRaw as { feedback_docente: string | null; created_at: string }[] | null)?.[0] ?? null;
      quiz = {
        id: q.id,
        titulo: q.titulo,
        fechaLimite: q.fecha_limite,
        intentosMaximos: q.intentos_maximos,
        intentosUsados: count ?? 0,
        feedbackDocente: ultimoIntento?.feedback_docente ?? null,
        preguntas: preguntas.map((p) => ({
          id: p.id, enunciado: p.enunciado, tipo: p.tipo,
          opciones: opciones.filter((o) => o.pregunta_id === p.id).map((o) => ({ id: o.id, texto: o.texto })),
        })),
      };
    }
  }

  const meta = TIPO_META[leccion.tipo] ?? TIPO_META.texto;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise">
          {curso && (
            <Link href={`/cursos/${curso.slug}`}
              className="group inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--text-faint)" }}>
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> {curso.titulo}
            </Link>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider">
              <meta.icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
            {hermanas.length > 0 && (
              <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
                {idx + 1} de {hermanas.length}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-serif-brand tracking-tight"
            style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 700, color: "var(--text)" }}>
            {leccion.titulo}
          </h1>

          {/* Progreso real dentro del curso */}
          {hermanas.length > 1 && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
                <span>Avance del curso</span>
                <span className="tabular-nums">{completadas.size}/{hermanas.length} · {progreso}%</span>
              </div>
              <div className="progress-track h-1.5 w-full">
                <div className="progress-bar h-full" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
        <div className="animate-rise rise-2">
          {leccion.tipo === "video" && leccion.video_url && (
            <ContentRenderer url={leccion.video_url} titulo={leccion.titulo} />
          )}

          {leccion.tipo === "texto" && leccion.contenido && (
            <article className="card whitespace-pre-line p-7 text-[0.95rem] leading-relaxed sm:p-9"
              style={{ color: "var(--text-muted)" }}>
              {leccion.contenido}
            </article>
          )}

          {leccion.tipo === "quiz" && (
            quiz && quiz.preguntas.length > 0
              ? <QuizTaker
                  quizId={quiz.id}
                  titulo={quiz.titulo}
                  preguntas={quiz.preguntas}
                  fechaLimite={quiz.fechaLimite}
                  intentosMaximos={quiz.intentosMaximos}
                  intentosUsados={quiz.intentosUsados}
                  feedbackDocente={quiz.feedbackDocente}
                />
              : <p className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Este quiz aún no tiene preguntas.
                </p>
          )}
        </div>

        <div className="animate-rise rise-2 mt-7">
          <LessonNotes cursoId={leccion.curso_id} leccionId={leccion.id} initialContent={initialNote} />
        </div>

        {/* Marcar completada */}
        <div className="animate-rise rise-2 mt-7">
          <MarcarCompletada
            leccionId={leccion.id}
            cursoId={leccion.curso_id}
            completed={estaCompletada}
            nextHref={siguiente ? `/aprender/${siguiente.id}` : undefined}
          />
          {progreso === 100 && (
            <div className="mt-4 rounded-xl p-4" style={{ background: "var(--accent-dim)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Curso completado</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Tu certificado ya está disponible para emitir.</p>
              <div className="mt-3"><CertificadoButton cursoId={leccion.curso_id} /></div>
            </div>
          )}
        </div>

        {/* Navegación entre lecciones */}
        {(anterior || siguiente) && (
          <div className="animate-rise rise-3 mt-10 flex items-stretch justify-between gap-3 border-t pt-6"
            style={{ borderColor: "var(--border)" }}>
            {anterior ? (
              <Link href={`/aprender/${anterior.id}`}
                className="card group flex max-w-[48%] items-center gap-3 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
                <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" style={{ color: "var(--primary)" }} />
                <span className="min-w-0">
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Anterior</span>
                  <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>{anterior.titulo}</span>
                </span>
              </Link>
            ) : <span />}
            {siguiente && (
              <Link href={`/aprender/${siguiente.id}`}
                className="card group ml-auto flex max-w-[48%] items-center gap-3 px-4 py-3 text-right transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
                <span className="min-w-0">
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Siguiente</span>
                  <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>{siguiente.titulo}</span>
                </span>
                <ArrowRight className="arrow-slide h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
              </Link>
            )}
          </div>
        )}
          </div>
          <div className="animate-rise rise-3 xl:sticky xl:top-24">
            <TutorChat cursoId={leccion.curso_id} cursoTitulo={curso?.titulo} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
