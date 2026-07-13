import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SecureAttachmentLink } from "@/components/SecureAttachmentLink";
import { TaskSubmitter } from "@/components/TaskSubmitter";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EntregaRubricaResultado, EntregaTarea, Tarea, TareaRubrica } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function EntregaPage({ params }: { params: Promise<{ tareaId: string }> }) {
  const { tareaId } = await params; const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/entregas/${tareaId}`);
  const supabase = await createClient(); if (!supabase) notFound();
  const { data: taskRaw } = await supabase.from("tareas").select("id,curso_id,titulo,instrucciones,fecha_limite,puntaje_maximo,permitir_reentrega,cursos(titulo,slug)").eq("id", tareaId).maybeSingle();
  const task = taskRaw as (Pick<Tarea, "id" | "curso_id" | "titulo" | "instrucciones" | "fecha_limite" | "puntaje_maximo" | "permitir_reentrega"> & { cursos: { titulo: string; slug: string } | null }) | null;
  if (!task) notFound();
  const [{ data: submissionRaw }, { data: criteriaRaw }] = await Promise.all([
    supabase.from("entregas_tarea").select("id,texto,enlace,archivo_path,estado,entregado_at,puntaje,feedback_docente").eq("tarea_id", task.id).eq("alumno_id", user.id).maybeSingle(),
    supabase.from("tarea_rubricas").select("id,criterio,descripcion,puntaje_maximo,orden").eq("tarea_id", task.id).order("orden"),
  ]);
  const submission = submissionRaw as (Pick<EntregaTarea, "id" | "texto" | "enlace" | "archivo_path" | "estado" | "entregado_at" | "puntaje" | "feedback_docente">) | null;
  const criteria = (criteriaRaw as Pick<TareaRubrica, "id" | "criterio" | "descripcion" | "puntaje_maximo" | "orden">[] | null) ?? [];
  let results: Pick<EntregaRubricaResultado, "rubrica_id" | "puntaje" | "comentario">[] = [];
  if (submission?.id) { const { data } = await supabase.from("entrega_rubrica_resultados").select("rubrica_id,puntaje,comentario").eq("entrega_id", submission.id); results = (data as typeof results | null) ?? []; }
  const resultsByRubric = new Map(results.map((result) => [result.rubrica_id, result]));
  const expired = task.fecha_limite && new Date(task.fecha_limite) < new Date();
  return <AppShell user={user}><div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12"><Link href="/mis-entregas" className="mb-5 inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}><ArrowLeft className="h-3.5 w-3.5" />Mis entregas</Link><div className="card mb-6 p-6 sm:p-8"><p className="eyebrow" style={{ color: "var(--primary)" }}>{task.cursos?.titulo ?? "Curso"}</p><h1 className="mt-2 font-serif-brand text-3xl font-bold" style={{ color: "var(--text)" }}>{task.titulo}</h1><p className="mt-4 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{task.instrucciones || "Sin instrucciones adicionales."}</p><div className="mt-5 flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-faint)" }}><span>{task.puntaje_maximo} puntos</span><span>{task.fecha_limite ? `${expired ? "Cerró" : "Cierra"} ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(task.fecha_limite))}` : "Sin fecha límite"}</span></div>{criteria.length > 0 && <div className="mt-5 rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}><p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Criterios de evaluación</p><div className="mt-2 grid gap-2">{criteria.map((item) => <div key={item.id} className="flex justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}><span>{item.criterio}{item.descripcion ? ` · ${item.descripcion}` : ""}</span><span className="shrink-0">{item.puntaje_maximo} pts</span></div>)}</div></div>}{submission?.feedback_docente && <div className="mt-5 rounded-xl p-4" style={{ background: "var(--accent-dim)" }}><p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Feedback docente {submission.puntaje !== null ? `· ${submission.puntaje}/${task.puntaje_maximo}` : ""}</p><p className="mt-2 whitespace-pre-line text-sm" style={{ color: "var(--text-muted)" }}>{submission.feedback_docente}</p></div>}{submission?.id && submission.archivo_path && <SecureAttachmentLink entregaId={submission.id} />}{submission?.puntaje !== null && results.length > 0 && <div className="mt-4 divide-y rounded-xl" style={{ border: "1px solid var(--border)" }}>{criteria.map((item) => { const result = resultsByRubric.get(item.id); return <div key={item.id} className="p-3"><p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{item.criterio} · {result?.puntaje ?? 0}/{item.puntaje_maximo}</p>{result?.comentario && <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{result.comentario}</p>}</div>; })}</div>}</div><TaskSubmitter tareaId={task.id} userId={user.id} initial={submission ? { texto: submission.texto, enlace: submission.enlace, archivo_path: submission.archivo_path, estado: submission.estado, entregado_at: submission.entregado_at } : null} /></div></AppShell>;
}
