import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RubricManager } from "@/components/RubricManager";
import { SubmissionReview } from "@/components/SubmissionReview";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, EntregaRubricaResultado, EntregaTarea, Profile, Tarea, TareaRubrica } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function ReviewTaskPage({ params }: { params: Promise<{ id: string; tareaId: string }> }) {
  const { id, tareaId } = await params;
  const user = await requireRole(["profesor", "admin"], `/profesor/cursos/${id}/entregas/${tareaId}`);
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: courseRaw } = await supabase.from("cursos").select("profesor_id").eq("id", id).single();
  const course = courseRaw as Pick<Curso, "profesor_id"> | null;
  if (!course || (course.profesor_id !== user.id && user.rol !== "admin")) notFound();
  const { data: taskRaw } = await supabase.from("tareas").select("id,titulo,puntaje_maximo,curso_id").eq("id", tareaId).single();
  const task = taskRaw as Pick<Tarea, "id" | "titulo" | "puntaje_maximo" | "curso_id"> | null;
  if (!task || task.curso_id !== id) notFound();

  const [{ data: criteriaRaw }, { data: subRaw }] = await Promise.all([
    supabase.from("tarea_rubricas").select("id,criterio,descripcion,puntaje_maximo,orden").eq("tarea_id", task.id).order("orden"),
    supabase.from("entregas_tarea").select("id,alumno_id,texto,enlace,archivo_path,estado,entregado_at,puntaje,feedback_docente").eq("tarea_id", task.id).order("entregado_at", { ascending: false }),
  ]);
  const criteria = (criteriaRaw as Pick<TareaRubrica, "id" | "criterio" | "descripcion" | "puntaje_maximo" | "orden">[] | null) ?? [];
  const submissions = (subRaw as Pick<EntregaTarea, "id" | "alumno_id" | "texto" | "enlace" | "archivo_path" | "estado" | "entregado_at" | "puntaje" | "feedback_docente">[] | null) ?? [];
  let profiles: Pick<Profile, "id" | "nombre" | "apellido" | "email">[] = [];
  let results: Pick<EntregaRubricaResultado, "entrega_id" | "rubrica_id" | "puntaje" | "comentario">[] = [];
  if (submissions.length) {
    const [profilesResponse, resultsResponse] = await Promise.all([
      supabase.from("profiles").select("id,nombre,apellido,email").in("id", submissions.map((submission) => submission.alumno_id)),
      supabase.from("entrega_rubrica_resultados").select("entrega_id,rubrica_id,puntaje,comentario").in("entrega_id", submissions.map((submission) => submission.id)),
    ]);
    profiles = (profilesResponse.data as typeof profiles | null) ?? [];
    results = (resultsResponse.data as typeof results | null) ?? [];
  }
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const resultsBySubmission = new Map<string, typeof results>();
  results.forEach((result) => resultsBySubmission.set(result.entrega_id, [...(resultsBySubmission.get(result.entrega_id) ?? []), result]));
  const rows = submissions.map((submission) => ({
    id: submission.id,
    alumno: [profilesById.get(submission.alumno_id)?.nombre, profilesById.get(submission.alumno_id)?.apellido].filter(Boolean).join(" ") || profilesById.get(submission.alumno_id)?.email || "Alumno",
    texto: submission.texto, enlace: submission.enlace, archivo_path: submission.archivo_path, estado: submission.estado,
    entregado_at: submission.entregado_at, puntaje: submission.puntaje, feedback_docente: submission.feedback_docente,
    resultados: resultsBySubmission.get(submission.id) ?? [],
  }));

  return <AppShell user={user}><div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12"><Link href={`/profesor/cursos/${id}/entregas`} className="mb-5 inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}><ArrowLeft className="h-3.5 w-3.5" />Volver a entregas</Link><h1 className="mb-2 font-serif-brand text-3xl font-bold" style={{ color: "var(--text)" }}>{task.titulo}</h1><p className="mb-7 text-sm" style={{ color: "var(--text-muted)" }}>Define cómo se evalúa y publica feedback útil. Puntaje máximo: {task.puntaje_maximo}.</p><RubricManager tareaId={task.id} criteria={criteria} maxScore={task.puntaje_maximo} /><SubmissionReview rows={rows} maxScore={task.puntaje_maximo} rubrics={criteria} /></div></AppShell>;
}
