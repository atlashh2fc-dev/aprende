"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ClipboardList, FileWarning, Loader2, Megaphone, Plus, Presentation, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventoAcademicoTipo } from "@/lib/supabase/database.types";

type AgendaEvent = { id: string; curso_id: string; titulo: string; tipo: EventoAcademicoTipo; descripcion: string | null; fecha_inicio: string; fecha_fin: string | null; curso_titulo: string };
type Course = { id: string; titulo: string };

const TYPE = {
  evaluacion: { label: "Evaluación", icon: FileWarning, color: "#B45309" },
  entrega: { label: "Entrega", icon: ClipboardList, color: "#9A5B2B" },
  sesion: { label: "Sesión", icon: Presentation, color: "var(--primary)" },
  aviso: { label: "Aviso", icon: Megaphone, color: "var(--text-muted)" },
} satisfies Record<EventoAcademicoTipo, { label: string; icon: typeof FileWarning; color: string }>;

function localDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(value));
}

export function AgendaBoard({ events, courses, canManage }: { events: AgendaEvent[]; courses: Course[]; canManage: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ curso_id: courses[0]?.id ?? "", titulo: "", tipo: "evaluacion" as EventoAcademicoTipo, fecha_inicio: "", descripcion: "", notificar: true });
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    events.forEach((event) => { const key = dateKey(event.fecha_inicio); map.set(key, [...(map.get(key) ?? []), event]); });
    return [...map.entries()];
  }, [events]);

  async function createEvent(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !form.curso_id || !form.titulo.trim() || !form.fecha_inicio) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setBusy(true); setError(null);
    const { data: createdRaw, error: insertError } = await supabase.from("eventos_academicos").insert({
      curso_id: form.curso_id,
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      descripcion: form.descripcion.trim() || null,
      fecha_inicio: new Date(form.fecha_inicio).toISOString(),
      creado_por: user.id,
      updated_at: new Date().toISOString(),
    } as never).select("id").single();
    if (insertError) { setBusy(false); setError("No se pudo publicar el evento. Revisa los datos e inténtalo de nuevo."); return; }
    if (form.notificar && createdRaw) {
      try {
        const notice = await fetch("/api/notificaciones/curso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cursoId: form.curso_id,
            eventoId: (createdRaw as { id: string }).id,
            tipo: form.tipo,
            titulo: form.titulo.trim(),
            mensaje: form.descripcion.trim() || `${TYPE[form.tipo].label} programada para ${localDateTime(new Date(form.fecha_inicio).toISOString())}.`,
            enlace: "/agenda",
          }),
        });
        if (!notice.ok) setError("El evento se publicó, pero no se pudo avisar a los alumnos.");
      } catch {
        setError("El evento se publicó, pero no se pudo avisar a los alumnos.");
      }
    }
    setBusy(false);
    setForm({ curso_id: courses[0]?.id ?? "", titulo: "", tipo: "evaluacion", fecha_inicio: "", descripcion: "", notificar: true });
    setShowForm(false); router.refresh();
  }

  async function deleteEvent(id: string) {
    const supabase = createClient();
    if (!supabase || !confirm("¿Eliminar este evento de la agenda?")) return;
    setBusy(true); setError(null);
    const { error: deleteError } = await supabase.from("eventos_academicos").delete().eq("id", id);
    setBusy(false);
    if (deleteError) { setError("No se pudo eliminar el evento."); return; }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div><h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Próximos hitos</h2><p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>Fechas, evaluaciones y comunicaciones de tus cursos</p></div>
          <CalendarDays className="h-5 w-5" style={{ color: "var(--primary)" }} />
        </div>
        {grouped.length === 0 ? (
          <div className="px-6 py-14 text-center"><CalendarDays className="mx-auto h-7 w-7" style={{ color: "var(--text-faint)" }} /><p className="mt-3 text-sm font-semibold" style={{ color: "var(--text)" }}>Aún no hay hitos programados.</p><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Las fechas de tus cursos aparecerán aquí.</p></div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {grouped.map(([day, dayEvents]) => (
              <div key={day} className="grid gap-3 px-5 py-5 sm:grid-cols-[100px_1fr]">
                <time className="text-xs font-semibold capitalize" style={{ color: "var(--text-faint)" }}>{new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`))}</time>
                <div className="grid gap-3">
                  {dayEvents.map((item) => { const meta = TYPE[item.tipo]; const Icon = meta.icon; return (
                    <article key={item.id} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${meta.color} 11%, transparent)`, color: meta.color }}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.12em]" style={{ color: meta.color }}>{meta.label} · {item.curso_titulo}</p><h3 className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{item.titulo}</h3></div>{canManage && <button type="button" onClick={() => deleteEvent(item.id)} disabled={busy} aria-label={`Eliminar ${item.titulo}`} className="p-1.5" style={{ color: "var(--text-faint)" }}><Trash2 className="h-4 w-4" /></button>}</div>{item.descripcion && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.descripcion}</p>}<p className="mt-3 text-xs font-medium" style={{ color: "var(--text-faint)" }}>{localDateTime(item.fecha_inicio)}</p></div></div>
                    </article>
                  ); })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {canManage && <aside className="card h-fit p-5 lg:sticky lg:top-24"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Publicar en la agenda</h2><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Visible para inscritos del curso.</p></div><button type="button" onClick={() => setShowForm((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--primary-dim)", color: "var(--primary)" }} aria-label="Crear evento"><Plus className="h-4 w-4" /></button></div>
        {showForm && <form onSubmit={createEvent} className="mt-5 grid gap-3 border-t pt-5" style={{ borderColor: "var(--border)" }}>
          <select value={form.curso_id} onChange={(event) => setForm({ ...form, curso_id: event.target.value })} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{courses.map((course) => <option key={course.id} value={course.id}>{course.titulo}</option>)}</select>
          <input value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} maxLength={160} required placeholder="Título: Prueba módulo 2" className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />
          <div className="grid grid-cols-2 gap-3"><select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as EventoAcademicoTipo })} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{Object.entries(TYPE).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><input type="datetime-local" value={form.fecha_inicio} onChange={(event) => setForm({ ...form, fecha_inicio: event.target.value })} required className="min-w-0 rounded-lg px-2 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /></div>
          <textarea value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Temario, instrucciones o enlace de la sesión" className="min-h-24 resize-y rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />
          <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}><input type="checkbox" checked={form.notificar} onChange={(event) => setForm({ ...form, notificar: event.target.checked })} className="h-4 w-4 rounded" /> Avisar a los alumnos inscritos</label>
          <button disabled={busy || !form.curso_id} className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}{busy ? "Publicando" : "Publicar evento"}</button>
        </form>}
        {error && <p className="mt-3 text-xs" style={{ color: "#b42318" }}>{error}</p>}
      </aside>}
    </div>
  );
}
