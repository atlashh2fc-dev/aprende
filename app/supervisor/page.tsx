import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SupervisorAssignments } from "@/components/SupervisorAssignments";
import { SupervisorFollowup, type FollowupRow } from "@/components/SupervisorFollowup";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupervisorPage() {
  const user = await requireRole(["supervisor", "admin"], "/supervisor");
  const supabase = await createClient();
  if (!user.institucion_id || !supabase) {
    return <AppShell user={user}><div className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><p className="card p-7 text-sm" style={{ color: "var(--text-muted)" }}>Esta cuenta aún no está asignada a una institución.</p></div></AppShell>;
  }
  const [institutionR, coursesR, learnersR, enrollmentsR] = await Promise.all([
    supabase.from("instituciones").select("nombre").eq("id", user.institucion_id).single(),
    supabase.from("cursos").select("id, titulo").eq("institucion_id", user.institucion_id).eq("estado", "publicado").order("titulo"),
    supabase.from("profiles").select("id, nombre, apellido, email").eq("institucion_id", user.institucion_id).eq("rol", "alumno").order("nombre"),
    supabase.from("inscripciones").select("id, alumno_id, curso_id, fecha_limite, estado"),
  ]);
  const courses = (coursesR.data as { id: string; titulo: string }[] | null) ?? [];
  const learners = ((learnersR.data as { id: string; nombre: string | null; apellido: string | null; email: string }[] | null) ?? []).map((learner) => ({ ...learner, nombre: [learner.nombre, learner.apellido].filter(Boolean).join(" ") || learner.email }));
  const courseIds = new Set(courses.map((course) => course.id));
  const learnerIds = new Set(learners.map((learner) => learner.id));
  const enrollments = ((enrollmentsR.data as { id: string; alumno_id: string; curso_id: string; fecha_limite: string | null; estado: string }[] | null) ?? []).filter((item) => courseIds.has(item.curso_id) && learnerIds.has(item.alumno_id));
  const institution = (institutionR.data as { nombre: string } | null)?.nombre ?? "Mi institución";
  const courseById = new Map(courses.map((course) => [course.id, course.titulo]));
  const learnerById = new Map(learners.map((learner) => [learner.id, learner]));
  const now = Date.now();
  const week = now + 7 * 24 * 60 * 60 * 1000;
  const followups: FollowupRow[] = enrollments.flatMap((item) => {
    if (!item.fecha_limite || item.estado === "completada") return [];
    const due = new Date(item.fecha_limite).getTime();
    if (due > week) return [];
    const learner = learnerById.get(item.alumno_id);
    if (!learner) return [];
    return [{ id: item.id, alumno: learner.nombre, email: learner.email, curso: courseById.get(item.curso_id) ?? "Curso", fecha_limite: item.fecha_limite, estado: due < now ? ("Vencido" as const) : ("Próximo" as const) }];
  }).sort((a, b) => new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime());

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}><ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio</Link>
        <div className="mb-8 mt-5"><p className="eyebrow flex items-center gap-2" style={{ color: "var(--primary)" }}><Building2 className="h-4 w-4" /> Cohorte</p><h1 className="mt-1 font-serif-brand text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{institution}</h1><p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Asigna capacitación y fechas límite a los alumnos de tu institución.</p></div>
        <div className="grid gap-6"><SupervisorFollowup rows={followups} /><SupervisorAssignments learners={learners} courses={courses} enrollments={enrollments} /></div>
      </div>
    </AppShell>
  );
}
