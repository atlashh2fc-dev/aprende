import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { VideoPlayer } from "@/components/VideoPlayer";
import { QuizTaker } from "@/components/QuizTaker";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Leccion, Curso, Quiz, QuizPregunta, QuizOpcion } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function LeccionPage({ params }: { params: Promise<{ leccionId: string }> }) {
  const { leccionId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/aprender/${leccionId}`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: leccionRaw } = await supabase
    .from("lecciones")
    .select("id, curso_id, titulo, tipo, contenido, video_url")
    .eq("id", leccionId)
    .single();
  const leccion = leccionRaw as Pick<Leccion, "id" | "curso_id" | "titulo" | "tipo" | "contenido" | "video_url"> | null;
  if (!leccion) notFound();

  const { data: cursoRaw } = await supabase.from("cursos").select("slug, titulo").eq("id", leccion.curso_id).single();
  const curso = cursoRaw as Pick<Curso, "slug" | "titulo"> | null;

  // Quiz (si la lección es de tipo quiz). Se seleccionan opciones SIN es_correcta.
  let quiz: { id: string; titulo: string; preguntas: { id: string; enunciado: string; tipo: "unica" | "multiple"; opciones: { id: string; texto: string }[] }[] } | null = null;
  if (leccion.tipo === "quiz") {
    const { data: qRaw } = await supabase.from("quizzes").select("id, titulo").eq("leccion_id", leccion.id).maybeSingle();
    const q = qRaw as Pick<Quiz, "id" | "titulo"> | null;
    if (q) {
      const { data: pRaw } = await supabase.from("quiz_preguntas").select("id, enunciado, tipo, orden").eq("quiz_id", q.id).order("orden");
      const preguntas = (pRaw as Pick<QuizPregunta, "id" | "enunciado" | "tipo" | "orden">[] | null) ?? [];
      const { data: oRaw } = await supabase.from("quiz_opciones").select("id, pregunta_id, texto, orden")
        .in("pregunta_id", preguntas.map((p) => p.id)).order("orden");
      const opciones = (oRaw as Pick<QuizOpcion, "id" | "pregunta_id" | "texto" | "orden">[] | null) ?? [];
      quiz = {
        id: q.id, titulo: q.titulo,
        preguntas: preguntas.map((p) => ({
          id: p.id, enunciado: p.enunciado, tipo: p.tipo,
          opciones: opciones.filter((o) => o.pregunta_id === p.id).map((o) => ({ id: o.id, texto: o.texto })),
        })),
      };
    }
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        {curso && (
          <Link href={`/cursos/${curso.slug}`} className="text-xs" style={{ color: "var(--text-faint)" }}>
            ← {curso.titulo}
          </Link>
        )}
        <h1 className="mt-3 mb-6 font-serif-brand" style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 700, color: "var(--text)" }}>
          {leccion.titulo}
        </h1>

        {leccion.tipo === "video" && leccion.video_url && <VideoPlayer url={leccion.video_url} />}

        {leccion.tipo === "texto" && leccion.contenido && (
          <article className="whitespace-pre-line text-[0.95rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {leccion.contenido}
          </article>
        )}

        {leccion.tipo === "quiz" && (
          quiz && quiz.preguntas.length > 0
            ? <QuizTaker quizId={quiz.id} titulo={quiz.titulo} preguntas={quiz.preguntas} />
            : <p className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Este quiz aún no tiene preguntas.</p>
        )}
      </div>
    </AppShell>
  );
}
