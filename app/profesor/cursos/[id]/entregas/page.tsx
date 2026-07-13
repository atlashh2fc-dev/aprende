import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardPenLine } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TaskManager } from "@/components/TaskManager";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, Tarea } from "@/lib/supabase/database.types";
export const dynamic = "force-dynamic";
export default async function EntregasCursoPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const user = await requireRole(["profesor", "admin"], `/profesor/cursos/${id}/entregas`); const supabase = await createClient(); if (!supabase) notFound(); const { data: courseRaw } = await supabase.from("cursos").select("id,titulo,profesor_id").eq("id", id).single(); const course = courseRaw as Pick<Curso,"id"|"titulo"|"profesor_id">|null; if (!course || (course.profesor_id !== user.id && user.rol !== "admin")) notFound(); const { data } = await supabase.from("tareas").select("id,titulo,fecha_limite,puntaje_maximo,publicada").eq("curso_id", id).order("fecha_limite"); const tareas = (data as Pick<Tarea,"id"|"titulo"|"fecha_limite"|"puntaje_maximo"|"publicada">[]|null)??[]; return <AppShell user={user}><div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12"><Link href={`/profesor/cursos/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-xs" style={{color:"var(--text-faint)"}}><ArrowLeft className="h-3.5 w-3.5"/>Volver al curso</Link><div className="mb-7 flex items-start gap-3"><ClipboardPenLine className="mt-1 h-5 w-5" style={{color:"var(--primary)"}}/><div><p className="eyebrow" style={{color:"var(--primary)"}}>Evaluación aplicada</p><h1 className="mt-1 font-serif-brand text-3xl font-bold" style={{color:"var(--text)"}}>Entregas · {course.titulo}</h1></div></div><TaskManager cursoId={id} basePath={`/profesor/cursos/${id}/entregas`} tareas={tareas}/></div></AppShell>; }
