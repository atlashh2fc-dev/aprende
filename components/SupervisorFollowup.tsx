"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type FollowupRow = { id: string; alumno: string; email: string; curso: string; fecha_limite: string; estado: "Vencido" | "Próximo" };

function localDate(value: string) { return value.slice(0, 10); }

export function SupervisorFollowup({ rows }: { rows: FollowupRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"todos" | FollowupRow["estado"]>("todos");
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const visible = useMemo(() => rows.filter((row) => filter === "todos" || row.estado === filter), [rows, filter]);

  async function save(id: string) {
    if (!date) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(id);
    const { error } = await supabase.from("inscripciones").update({ fecha_limite: new Date(`${date}T23:59:59`).toISOString() } as never).eq("id", id);
    setBusy(null);
    if (!error) { setEditing(null); router.refresh(); }
  }

  if (!rows.length) return null;
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div><h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><CalendarClock className="h-4 w-4" style={{ color: "var(--primary)" }} /> Acciones de seguimiento</h2><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Fechas límite vencidas o próximas en los siguientes 7 días.</p></div>
        <div className="flex gap-1.5">{(["todos", "Vencido", "Próximo"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={filter === item ? { background: "var(--primary-dim)", color: "var(--primary)" } : { background: "var(--surface-2)", color: "var(--text-muted)" }}>{item === "todos" ? "Todos" : item}</button>)}</div>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>{visible.map((row) => <div key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: row.estado === "Vencido" ? "rgba(239,68,68,0.1)" : "var(--primary-dim)", color: row.estado === "Vencido" ? "#dc2626" : "var(--primary)" }}>{row.estado === "Vencido" ? <TriangleAlert className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{row.alumno} · {row.curso}</p><p className="text-xs" style={{ color: "var(--text-faint)" }}>{row.email} · vence {new Date(row.fecha_limite).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}</p></div>{editing === row.id ? <div className="flex items-center gap-2"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg px-2 py-1.5 text-xs outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /><button onClick={() => save(row.id)} disabled={busy === row.id} className="btn-primary rounded-lg px-3 py-1.5 text-xs">{busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}</button></div> : <button onClick={() => { setEditing(row.id); setDate(localDate(row.fecha_limite)); }} className="btn-ghost shrink-0 rounded-lg px-3 py-2 text-xs">Reprogramar</button>}</div>)}</div>
      {visible.length === 0 && <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}><CheckCircle2 className="mx-auto mb-2 h-5 w-5" style={{ color: "var(--accent)" }} />No hay acciones pendientes.</p>}
    </section>
  );
}
