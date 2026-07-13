"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, XCircle } from "lucide-react";

export interface GradebookRow {
  id: string;
  alumno: string;
  evaluacion: string;
  puntaje: number;
  aprobado: boolean;
  createdAt: string;
  feedback: string | null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function Gradebook({ rows }: { rows: GradebookRow[] }) {
  const [feedback, setFeedback] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.feedback ?? ""])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(row: GradebookRow) {
    setSaving(row.id); setSaved(null); setError(null);
    try {
      const response = await fetch("/api/quiz/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentoId: row.id, feedback: feedback[row.id] ?? "" }),
      });
      if (!response.ok) throw new Error();
      setSaved(row.id);
    } catch {
      setError("No se pudo guardar la retroalimentación. Intenta nuevamente.");
    } finally {
      setSaving(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Aún no hay intentos enviados</p>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Cuando un alumno complete una evaluación, aparecerá aquí para revisión y feedback.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {error && <p className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>{error}</p>}
      {rows.map((row, index) => (
        <article key={row.id} className={`card animate-rise rise-${(index % 5) + 1} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{row.alumno}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{row.evaluacion} · {formatDate(row.createdAt)}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: row.aprobado ? "var(--accent-dim)" : "rgba(239,68,68,0.1)", color: row.aprobado ? "var(--accent)" : "#dc2626" }}>
              {row.aprobado ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {row.puntaje}% · {row.aprobado ? "Aprobado" : "No aprobado"}
            </span>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              <MessageSquareText className="h-3.5 w-3.5" /> Retroalimentación para el alumno
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-colors focus:border-[var(--primary)]"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
              value={feedback[row.id] ?? ""}
              maxLength={4000}
              onChange={(event) => setFeedback((current) => ({ ...current, [row.id]: event.target.value }))}
              placeholder="Destaca avances, explica el error y sugiere el siguiente paso."
            />
            <div className="mt-3 flex items-center gap-3">
              <button onClick={() => save(row)} disabled={saving === row.id}
                className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs disabled:opacity-60">
                {saving === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquareText className="h-3.5 w-3.5" />}
                Guardar feedback
              </button>
              {saved === row.id && <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Guardado</span>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
