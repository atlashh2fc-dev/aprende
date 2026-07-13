import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Gradebook, type GradebookRow } from "@/components/Gradebook";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, Profile, Quiz, QuizIntento } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function CalificacionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["profesor", "admin"], `/profesor/cursos/${id}/calificaciones`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: cursoRaw } = await supabase.from("cursos").select("id, titulo, profesor_id").eq("id", id).single();
  const curso = cursoRaw as Pick<Curso, "id" | "titulo" | "profesor_id"> | null;
  if (!curso || (curso.profesor_id !== user.id && user.rol !== "admin")) notFound();

  const { data: quizzesRaw } = await supabase.from("quizzes").select("id, titulo").eq("curso_id", id);
  const quizzes = (quizzesRaw as Pick<Quiz, "id" | "titulo">[] | null) ?? [];
  const quizTitles = new Map(quizzes.map((quiz) => [quiz.id, quiz.titulo]));
  let intentos: Pick<QuizIntento, "id" | "alumno_id" | "quiz_id" | "puntaje" | "aprobado" | "created_at" | "feedback_docente">[] = [];
  if (quizzes.length) {
    const { data } = await supabase
      .from("quiz_intentos")
      .select("id, alumno_id, quiz_id, puntaje, aprobado, created_at, feedback_docente")
      .in("quiz_id", quizzes.map((quiz) => quiz.id))
      .order("created_at", { ascending: false });
    intentos = (data as typeof intentos | null) ?? [];
  }

  const alumnoIds = [...new Set(intentos.map((intento) => intento.alumno_id))];
  let alumnos: Pick<Profile, "id" | "nombre" | "apellido" | "email">[] = [];
  if (alumnoIds.length) {
    const { data } = await supabase.from("profiles").select("id, nombre, apellido, email").in("id", alumnoIds);
    alumnos = (data as typeof alumnos | null) ?? [];
  }
  const alumnoPorId = new Map(alumnos.map((alumno) => [alumno.id, alumno]));
  const rows: GradebookRow[] = intentos.map((intento) => {
    const alumno = alumnoPorId.get(intento.alumno_id);
    return {
      id: intento.id,
      alumno: [alumno?.nombre, alumno?.apellido].filter(Boolean).join(" ") || alumno?.email || "Alumno sin nombre",
      evaluacion: quizTitles.get(intento.quiz_id) ?? "Evaluación",
      puntaje: intento.puntaje,
      aprobado: intento.aprobado,
      createdAt: intento.created_at,
      feedback: intento.feedback_docente,
    };
  });

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href={`/profesor/cursos/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80" style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al curso
        </Link>
        <div className="animate-rise mb-8 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}><ClipboardCheck className="h-5 w-5" /></span>
          <div>
            <p className="eyebrow" style={{ color: "var(--primary)" }}>Seguimiento de evaluación</p>
            <h1 className="mt-1 font-serif-brand text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Libro de calificaciones</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{curso.titulo} · {rows.length} intento{rows.length === 1 ? "" : "s"} registrado{rows.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <Gradebook rows={rows} />
      </div>
    </AppShell>
  );
}
