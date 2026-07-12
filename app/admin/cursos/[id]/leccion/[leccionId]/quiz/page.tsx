import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuizBuilder } from "@/components/admin/QuizBuilder";
import type { PreguntaRow, OpcionRow } from "@/components/admin/QuizBuilder";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, Leccion, Quiz, QuizPregunta, QuizOpcion } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function QuizBuilderPage({ params }: { params: Promise<{ id: string; leccionId: string }> }) {
  const { id, leccionId } = await params;
  const user = await requireRole(["admin", "profesor"], `/admin/cursos/${id}/leccion/${leccionId}/quiz`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: cursoRaw } = await supabase.from("cursos").select("id, titulo").eq("id", id).single();
  const curso = cursoRaw as Pick<Curso, "id" | "titulo"> | null;
  if (!curso) notFound();

  const { data: leccionRaw } = await supabase
    .from("lecciones").select("id, titulo, tipo, curso_id").eq("id", leccionId).single();
  const leccion = leccionRaw as Pick<Leccion, "id" | "titulo" | "tipo" | "curso_id"> | null;
  if (!leccion || leccion.curso_id !== id) notFound();

  const { data: quizRaw } = await supabase.from("quizzes").select("*").eq("leccion_id", leccionId).maybeSingle();
  const quiz = quizRaw as Quiz | null;

  let preguntas: PreguntaRow[] = [];
  if (quiz) {
    const { data: pRaw } = await supabase
      .from("quiz_preguntas").select("id, enunciado, tipo, orden").eq("quiz_id", quiz.id).order("orden");
    const pregs = (pRaw as Pick<QuizPregunta, "id" | "enunciado" | "tipo" | "orden">[] | null) ?? [];

    let opciones: Pick<QuizOpcion, "id" | "pregunta_id" | "texto" | "es_correcta" | "orden">[] = [];
    if (pregs.length) {
      const { data: oRaw } = await supabase
        .from("quiz_opciones").select("id, pregunta_id, texto, es_correcta, orden")
        .in("pregunta_id", pregs.map((p) => p.id)).order("orden");
      opciones = (oRaw as typeof opciones | null) ?? [];
    }

    preguntas = pregs.map((p) => ({
      id: p.id, enunciado: p.enunciado, tipo: p.tipo, orden: p.orden,
      opciones: opciones.filter((o) => o.pregunta_id === p.id)
        .map<OpcionRow>((o) => ({ id: o.id, texto: o.texto, es_correcta: o.es_correcta, orden: o.orden })),
    }));
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href={`/admin/cursos/${id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al curso
        </Link>
        <div className="animate-rise mb-6">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Quiz · {curso.titulo}</p>
          <h1 className="mt-1 font-serif-brand tracking-tight"
            style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", color: "var(--text)" }}>
            {leccion.titulo}
          </h1>
        </div>
        <div className="animate-rise rise-2">
          <QuizBuilder cursoId={id} leccionId={leccionId} leccionTitulo={leccion.titulo}
            quiz={quiz} preguntas={preguntas} />
        </div>
      </div>
    </AppShell>
  );
}
