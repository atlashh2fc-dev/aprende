"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CalendarClock, CheckCheck, ClipboardList, FileWarning, Loader2, Megaphone, Presentation } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EventoAcademicoTipo } from "@/lib/supabase/database.types";

export interface NotificationRow {
  id: string;
  tipo: EventoAcademicoTipo;
  titulo: string;
  mensaje: string | null;
  enlace: string | null;
  leida_at: string | null;
  created_at: string;
}

const META = {
  evaluacion: { label: "Evaluación", icon: FileWarning, color: "#B45309" },
  entrega: { label: "Entrega", icon: ClipboardList, color: "#9A5B2B" },
  sesion: { label: "Sesión", icon: Presentation, color: "var(--primary)" },
  aviso: { label: "Aviso", icon: Megaphone, color: "var(--text-muted)" },
} satisfies Record<EventoAcademicoTipo, { label: string; icon: typeof FileWarning; color: string }>;

function formatted(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function NotificationsInbox({ initialRows }: { initialRows: NotificationRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<string | null>(null);

  async function markRead(id: string) {
    const current = rows.find((row) => row.id === id);
    if (!current || current.leida_at) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(id);
    const now = new Date().toISOString();
    const { error } = await supabase.from("notificaciones").update({ leida_at: now } as never).eq("id", id);
    if (!error) setRows((items) => items.map((row) => row.id === id ? { ...row, leida_at: now } : row));
    setBusy(null);
  }

  async function markAllRead() {
    const pending = rows.filter((row) => !row.leida_at);
    if (!pending.length) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy("all");
    const now = new Date().toISOString();
    const { error } = await supabase.from("notificaciones").update({ leida_at: now } as never).is("leida_at", null);
    if (!error) setRows((items) => items.map((row) => row.leida_at ? row : { ...row, leida_at: now }));
    setBusy(null);
  }

  const pendingCount = rows.filter((row) => !row.leida_at).length;
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{pendingCount ? `${pendingCount} sin leer` : "Estás al día"}</p>
        {pendingCount > 0 && <button onClick={markAllRead} disabled={busy === "all"} className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs disabled:opacity-60">{busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />} Marcar todo como leído</button>}
      </div>
      {rows.length === 0 ? (
        <div className="card p-10 text-center"><Bell className="mx-auto h-7 w-7" style={{ color: "var(--text-faint)" }} /><p className="mt-3 text-sm font-semibold" style={{ color: "var(--text)" }}>Sin avisos por ahora</p><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Las comunicaciones de tus cursos aparecerán aquí.</p></div>
      ) : rows.map((row, index) => {
        const meta = META[row.tipo]; const Icon = meta.icon;
        return <article key={row.id} className={`card animate-rise rise-${(index % 5) + 1} p-5 ${row.leida_at ? "opacity-80" : ""}`} style={!row.leida_at ? { borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))" } : undefined}>
          <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, color: meta.color }}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.12em]" style={{ color: meta.color }}>{meta.label}</p><h2 className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{row.titulo}</h2></div>{!row.leida_at && <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>NUEVO</span>}</div>{row.mensaje && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.mensaje}</p>}<div className="mt-3 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}><CalendarClock className="h-3.5 w-3.5" />{formatted(row.created_at)}</span>{row.enlace && <Link href={row.enlace} onClick={() => markRead(row.id)} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Ver en agenda</Link>}{!row.leida_at && <button onClick={() => markRead(row.id)} disabled={busy === row.id} className="text-xs font-semibold disabled:opacity-50" style={{ color: "var(--text-muted)" }}>{busy === row.id ? "Guardando…" : "Marcar como leído"}</button>}</div></div></div>
        </article>;
      })}
    </div>
  );
}
