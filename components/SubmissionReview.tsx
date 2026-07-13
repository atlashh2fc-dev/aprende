"use client";

import { useState } from "react";
import { ExternalLink, FileText, Loader2, Save } from "lucide-react";

type Rubric = { id: string; criterio: string; descripcion: string | null; puntaje_maximo: number };
type Result = { rubrica_id: string; puntaje: number; comentario: string | null };
type Row = { id: string; alumno: string; texto: string | null; enlace: string | null; archivo_path: string | null; estado: string; entregado_at: string; puntaje: number | null; feedback_docente: string | null; resultados: Result[] };
type Draft = { puntaje: string; feedback: string; rubrica: Record<string, { puntaje: string; comentario: string }> };

function initialDraft(row: Row, rubrics: Rubric[]): Draft {
  const resultById = new Map(row.resultados.map((result) => [result.rubrica_id, result]));
  return { puntaje: row.puntaje?.toString() ?? "", feedback: row.feedback_docente ?? "", rubrica: Object.fromEntries(rubrics.map((rubric) => {
    const result = resultById.get(rubric.id);
    return [rubric.id, { puntaje: result?.puntaje.toString() ?? "", comentario: result?.comentario ?? "" }];
  })) };
}

export function SubmissionReview({ rows, maxScore, rubrics }: { rows: Row[]; maxScore: number; rubrics: Rubric[] }) {
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((row) => [row.id, initialDraft(row, rubrics)])));
  const [busy, setBusy] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const rubricTotal = rubrics.reduce((sum, rubric) => sum + rubric.puntaje_maximo, 0);

  async function openFile(id: string) {
    try { const response = await fetch(`/api/entregas/file?entregaId=${id}`); const data = await response.json(); if (!response.ok || !data.url) throw new Error(); window.open(data.url, "_blank", "noopener,noreferrer"); } catch { setMessage("No se pudo abrir el archivo adjunto."); }
  }
  async function save(id: string) {
    const value = values[id]; if (!value) return;
    setBusy(id); setMessage(null);
    const rubric = rubrics.map((item) => ({ rubricaId: item.id, puntaje: Number(value.rubrica[item.id]?.puntaje), comentario: value.rubrica[item.id]?.comentario }));
    try {
      const response = await fetch("/api/entregas/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entregaId: id, puntaje: Number(value.puntaje), feedback: value.feedback, ...(rubrics.length ? { rubrica: rubric } : {}) }) });
      if (!response.ok) throw new Error(); setMessage("Revisión publicada y alumno avisado.");
    } catch { setMessage("No se pudo guardar. Revisa los puntajes ingresados."); } finally { setBusy(null); }
  }
  return <div className="grid gap-4">{message && <p className="text-xs" style={{ color: message.includes("publicada") ? "var(--accent)" : "#dc2626" }}>{message}</p>}{rows.length === 0 ? <p className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Aún no hay entregas enviadas.</p> : rows.map((row) => { const value = values[row.id] ?? initialDraft(row, rubrics); const total = rubrics.reduce((sum, item) => sum + (Number(value.rubrica[item.id]?.puntaje) || 0), 0); return <article key={row.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{row.alumno}</p><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{row.estado} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.entregado_at))}</p></div>{row.puntaje !== null && <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{row.puntaje}/{maxScore}</span>}</div>
    {row.texto && <p className="mt-4 whitespace-pre-line rounded-xl p-4 text-sm" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{row.texto}</p>}{row.enlace && <a href={row.enlace} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--primary)" }}><ExternalLink className="h-3.5 w-3.5" />Abrir enlace entregado</a>}{row.archivo_path && <button onClick={() => openFile(row.id)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--primary)" }}><FileText className="h-3.5 w-3.5" />Abrir archivo adjunto</button>}
    {rubrics.length > 0 ? <div className="mt-5 grid gap-3">{rubrics.map((rubric) => <div key={rubric.id} className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium" style={{ color: "var(--text)" }}>{rubric.criterio}</p>{rubric.descripcion && <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>{rubric.descripcion}</p>}</div><input type="number" min={0} max={rubric.puntaje_maximo} value={value.rubrica[rubric.id]?.puntaje ?? ""} onChange={(event) => setValues((current) => ({ ...current, [row.id]: { ...value, rubrica: { ...value.rubrica, [rubric.id]: { ...value.rubrica[rubric.id], puntaje: event.target.value } } } }))} placeholder={`0-${rubric.puntaje_maximo}`} className="w-20 rounded-lg px-2 py-2 text-sm outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /></div><textarea value={value.rubrica[rubric.id]?.comentario ?? ""} onChange={(event) => setValues((current) => ({ ...current, [row.id]: { ...value, rubrica: { ...value.rubrica, [rubric.id]: { ...value.rubrica[rubric.id], comentario: event.target.value } } } }))} rows={2} placeholder="Feedback de este criterio (opcional)" className="mt-2 w-full rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>)}<p className="text-right text-xs font-semibold" style={{ color: total <= maxScore ? "var(--primary)" : "#dc2626" }}>Total: {total}/{maxScore}{rubricTotal !== maxScore ? ` · rúbrica ${rubricTotal} pts` : ""}</p></div> : <input type="number" min={0} max={maxScore} value={value.puntaje} onChange={(event) => setValues((current) => ({ ...current, [row.id]: { ...value, puntaje: event.target.value } }))} placeholder={`0-${maxScore}`} className="mt-4 w-32 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />}
    <textarea value={value.feedback} onChange={(event) => setValues((current) => ({ ...current, [row.id]: { ...value, feedback: event.target.value } }))} placeholder="Feedback general para el alumno" rows={3} className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /><button onClick={() => save(row.id)} disabled={busy === row.id || (rubrics.length ? Object.values(value.rubrica).some((item) => item.puntaje === "") : !value.puntaje)} className="btn-ghost mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs disabled:opacity-50">{busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Publicar revisión</button></article>; })}</div>;
}
