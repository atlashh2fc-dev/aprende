"use client";

import { useMemo, useState } from "react";
import { Building2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AreaTipo } from "@/lib/supabase/database.types";

export interface InstOption { id: string; nombre: string }
export interface CourseOption { id: string; titulo: string; institucion_id: string | null }
export interface AreaRow { id: string; institucion_id: string; nombre: string; slug: string; tipo: AreaTipo; miembros: number; curso_ids: string[] }

const TYPE: Record<AreaTipo, string> = { area: "Área", unidad_negocio: "Unidad de negocio", campana: "Campaña" };
const inputClass = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";
const style = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 40);

export function AreasManager({ areas: initial, instituciones, cursos }: { areas: AreaRow[]; instituciones: InstOption[]; cursos: CourseOption[] }) {
  const supabase = createClient();
  const [areas, setAreas] = useState(initial);
  const [form, setForm] = useState({ nombre: "", institucion_id: instituciones[0]?.id ?? "", tipo: "area" as AreaTipo });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instName = useMemo(() => new Map(instituciones.map((item) => [item.id, item.nombre])), [instituciones]);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    const nombre = form.nombre.trim(); const slug = slugify(nombre);
    if (!supabase || !nombre || !form.institucion_id || !slug) { setError("Completa un nombre válido y la empresa."); return; }
    setBusy("new");
    const { data, error } = await supabase.from("areas").insert({ nombre, slug, institucion_id: form.institucion_id, tipo: form.tipo } as never).select("id, institucion_id, nombre, slug, tipo").single();
    setBusy(null); if (error) { setError(error.message); return; }
    setAreas((prev) => [...prev, { ...(data as Omit<AreaRow, "miembros" | "curso_ids">), miembros: 0, curso_ids: [] }]); setForm((prev) => ({ ...prev, nombre: "" }));
  }
  async function remove(id: string) { if (!supabase || !confirm("¿Eliminar esta área? No borra personas ni cursos.")) return; setBusy(id); const { error } = await supabase.from("areas").delete().eq("id", id); setBusy(null); if (error) { setError(error.message); return; } setAreas((prev) => prev.filter((area) => area.id !== id)); }
  async function toggleCourse(area: AreaRow, courseId: string, assigned: boolean) {
    if (!supabase) return; setBusy(area.id); setError(null);
    const result = assigned ? await supabase.from("curso_areas").delete().eq("area_id", area.id).eq("curso_id", courseId) : await supabase.from("curso_areas").insert({ area_id: area.id, curso_id: courseId } as never);
    setBusy(null); if (result.error) { setError(result.error.message); return; }
    setAreas((prev) => prev.map((item) => item.id !== area.id ? item : { ...item, curso_ids: assigned ? item.curso_ids.filter((id) => id !== courseId) : [...item.curso_ids, courseId] }));
  }
  return <div className="grid gap-4">
    <form onSubmit={create} className="card grid gap-3 p-4 sm:grid-cols-[1fr_220px_180px_auto]">
      <input className={inputClass} style={style} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Ej. RR.HH., Equifax o Campaña invierno" />
      <select className={inputClass} style={style} value={form.institucion_id} onChange={(event) => setForm({ ...form, institucion_id: event.target.value })}>{instituciones.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
      <select className={inputClass} style={style} value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as AreaTipo })}>{(Object.keys(TYPE) as AreaTipo[]).map((type) => <option key={type} value={type}>{TYPE[type]}</option>)}</select>
      <button disabled={busy === "new"} className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs disabled:opacity-60">{busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear</button>
    </form>
    {error && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>{error}</p>}
    <div className="grid gap-3 md:grid-cols-2">{areas.map((area) => { const available = cursos.filter((course) => course.institucion_id === area.institucion_id); return <div key={area.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}><Building2 className="h-5 w-5" /></span><div><p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{area.nombre}</p><p className="text-xs" style={{ color: "var(--text-faint)" }}>{TYPE[area.tipo]} · {instName.get(area.institucion_id)}</p></div></div><button aria-label="Eliminar área" onClick={() => remove(area.id)} disabled={busy === area.id} style={{ color: "#dc2626" }}>{busy === area.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div><p className="mt-3 inline-flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}><Users className="h-3.5 w-3.5" /> {area.miembros} personas</p><details className="mt-4"><summary className="cursor-pointer text-xs font-semibold" style={{ color: "var(--primary)" }}>Capacitaciones asignadas · {area.curso_ids.length}</summary><div className="mt-3 grid gap-2">{available.length ? available.map((course) => <label key={course.id} className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}><input type="checkbox" checked={area.curso_ids.includes(course.id)} disabled={busy === area.id} onChange={() => toggleCourse(area, course.id, area.curso_ids.includes(course.id))} />{course.titulo}</label>) : <p className="text-xs" style={{ color: "var(--text-faint)" }}>No hay cursos de esta empresa.</p>}</div></details></div>; })}</div>
  </div>;
}
