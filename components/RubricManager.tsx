"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Criterion = { id: string; criterio: string; descripcion: string | null; puntaje_maximo: number; orden: number };

export function RubricManager({ tareaId, criteria, maxScore }: { tareaId: string; criteria: Criterion[]; maxScore: number }) {
  const router = useRouter();
  const [form, setForm] = useState({ criterio: "", descripcion: "", maximo: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCriterion(event: React.FormEvent) {
    event.preventDefault();
    const maximo = Number(form.maximo);
    if (!form.criterio.trim() || !Number.isInteger(maximo) || maximo < 1 || total + maximo > maxScore) {
      setError(`La rúbrica no puede superar los ${maxScore} puntos de la entrega.`); return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from("tarea_rubricas").insert({
      tarea_id: tareaId,
      criterio: form.criterio.trim(),
      descripcion: form.descripcion.trim() || null,
      puntaje_maximo: maximo,
      orden: criteria.length,
    } as never);
    setBusy(false);
    if (error) { setError("No se pudo guardar el criterio."); return; }
    setForm({ criterio: "", descripcion: "", maximo: "" }); router.refresh();
  }

  async function removeCriterion(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from("tarea_rubricas").delete().eq("id", id);
    setBusy(false);
    if (error) { setError("No se pudo eliminar el criterio."); return; }
    router.refresh();
  }

  const total = criteria.reduce((sum, item) => sum + item.puntaje_maximo, 0);
  return <section className="card mb-6 p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Rúbrica de evaluación</h2><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Define criterios claros antes de corregir. La nota será la suma de sus puntajes.</p></div><p className="text-xs font-semibold" style={{ color: total ? "var(--primary)" : "var(--text-faint)" }}>{total}/{maxScore} puntos</p></div>
    {criteria.length > 0 && <div className="mt-4 divide-y rounded-xl" style={{ border: "1px solid var(--border)" }}>{criteria.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 p-3"><div><p className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.criterio} <span style={{ color: "var(--text-faint)" }}>· {item.puntaje_maximo} pts</span></p>{item.descripcion && <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{item.descripcion}</p>}</div><button onClick={() => removeCriterion(item.id)} disabled={busy} aria-label={`Eliminar ${item.criterio}`} className="rounded-md p-1.5 disabled:opacity-50" style={{ color: "var(--text-faint)" }}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
    <form onSubmit={addCriterion} className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_auto]"><div><input required value={form.criterio} onChange={(event) => setForm({ ...form, criterio: event.target.value })} placeholder="Criterio: Argumentación" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /><input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Qué se observará (opcional)" className="mt-2 w-full rounded-xl px-3 py-2 text-xs outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} /></div><input required type="number" min={1} step={1} value={form.maximo} onChange={(event) => setForm({ ...form, maximo: event.target.value })} placeholder="Puntos" className="h-[42px] rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /><button disabled={busy} className="btn-ghost h-[42px] inline-flex items-center justify-center gap-2 rounded-lg px-3 text-xs disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Añadir</button></form>
    {total > 0 && <p className="mt-3 text-xs" style={{ color: total === maxScore ? "var(--accent)" : "var(--text-faint)" }}>{total === maxScore ? "La rúbrica coincide con el puntaje total de la entrega." : `Quedan ${maxScore - total} puntos por distribuir.`}</p>}
    {error && <p className="mt-3 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
  </section>;
}
