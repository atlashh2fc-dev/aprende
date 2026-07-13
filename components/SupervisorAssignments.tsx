"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Loader2, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Learner = { id: string; nombre: string; email: string };
type Course = { id: string; titulo: string };
type Enrollment = { alumno_id: string; curso_id: string; fecha_limite: string | null; estado: string };

export function SupervisorAssignments({ learners, courses, enrollments }: {
  learners: Learner[]; courses: Course[]; enrollments: Enrollment[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visible = learners.filter((learner) => `${learner.nombre} ${learner.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  const already = new Set(enrollments.filter((item) => item.curso_id === courseId).map((item) => item.alumno_id));

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function assign() {
    if (!courseId || !selected.length) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true); setError(null);
    const fecha_limite = dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null;
    const { error } = await supabase.from("inscripciones").upsert(
      selected.map((alumno_id) => ({ alumno_id, curso_id: courseId, estado: "activa", fecha_limite })) as never,
      { onConflict: "alumno_id,curso_id" },
    );
    setBusy(false);
    if (error) { setError(error.message); return; }
    setSelected([]); router.refresh();
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><Users className="h-4 w-4" style={{ color: "var(--primary)" }} /> Asignar capacitación</h2>
        <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Inscríbelos en un curso de la cohorte y, si corresponde, define una fecha límite.</p>
      </div>
      {courses.length === 0 || learners.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Necesitas al menos un curso y un alumno en esta institución.</p>
      ) : (
        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setSelected([]); }} className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.titulo}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-xl px-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}><CalendarDays className="h-4 w-4" /><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="bg-transparent py-2.5 text-sm outline-none" style={{ color: "var(--text)" }} /></label>
          </div>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-faint)" }} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar alumno…" className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /></div>
          <div className="max-h-72 divide-y overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            {visible.map((learner) => {
              const enrolled = already.has(learner.id);
              return <label key={learner.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]">
                <input type="checkbox" checked={selectedSet.has(learner.id)} onChange={() => toggle(learner.id)} className="sr-only" />
                <span className="flex h-5 w-5 items-center justify-center rounded-md border" style={{ borderColor: selectedSet.has(learner.id) ? "var(--primary)" : "var(--border-strong)", background: selectedSet.has(learner.id) ? "var(--primary)" : "transparent" }}>{selectedSet.has(learner.id) && <Check className="h-3.5 w-3.5" style={{ color: "var(--on-primary)" }} />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>{learner.nombre}</span><span className="block truncate text-xs" style={{ color: "var(--text-faint)" }}>{learner.email}</span></span>
                {enrolled && <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ya inscrito</span>}
              </label>;
            })}
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex items-center justify-between gap-3"><span className="text-xs" style={{ color: "var(--text-faint)" }}>{selected.length} seleccionados</span><button onClick={assign} disabled={busy || !selected.length} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}{busy ? "Asignando…" : "Asignar curso"}</button></div>
        </div>
      )}
    </section>
  );
}
