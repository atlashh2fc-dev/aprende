"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Check, RotateCcw, Send } from "lucide-react";

interface Pregunta {
  id: string;
  enunciado: string;
  tipo: "unica" | "multiple";
  opciones: { id: string; texto: string }[];
}

interface Resultado { puntaje: number; aprobado: boolean; correctas: number; total: number; }

export function QuizTaker({ quizId, titulo, preguntas }: { quizId: string; titulo: string; preguntas: Pregunta[] }) {
  const [respuestas, setRespuestas] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contestadas = preguntas.filter((p) => (respuestas[p.id] ?? []).length > 0).length;
  const progreso = preguntas.length ? Math.round((contestadas / preguntas.length) * 100) : 0;

  function toggle(preguntaId: string, opcionId: string, multiple: boolean) {
    setRespuestas((prev) => {
      const actual = new Set(prev[preguntaId] ?? []);
      if (multiple) {
        if (actual.has(opcionId)) actual.delete(opcionId);
        else actual.add(opcionId);
      } else {
        actual.clear();
        actual.add(opcionId);
      }
      return { ...prev, [preguntaId]: [...actual] };
    });
  }

  async function enviar() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/quiz/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, respuestas }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al calificar"); return; }
      setResultado(data);
    } catch {
      setError("No se pudo enviar el quiz.");
    } finally {
      setLoading(false);
    }
  }

  if (resultado) {
    return (
      <div className="card animate-rise p-10 text-center" style={{ boxShadow: "var(--shadow-md)" }}>
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: resultado.aprobado ? "var(--accent-dim)" : "rgba(239,68,68,0.1)",
            border: `2px solid ${resultado.aprobado ? "var(--accent)" : "#ef4444"}`,
          }}>
          {resultado.aprobado
            ? <CheckCircle2 className="h-9 w-9" style={{ color: "var(--accent)" }} />
            : <XCircle className="h-9 w-9" style={{ color: "#ef4444" }} />}
        </span>
        <p className="mt-5 font-serif-brand text-5xl font-bold tabular-nums tracking-tight" style={{ color: "var(--text)" }}>
          {resultado.puntaje}%
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {resultado.correctas} de {resultado.total} correctas ·{" "}
          <strong style={{ color: resultado.aprobado ? "var(--accent)" : "#ef4444" }}>
            {resultado.aprobado ? "¡Aprobado!" : "No aprobado"}
          </strong>
        </p>
        <div className="progress-track mx-auto mt-6 h-2 max-w-xs">
          <div className="progress-bar h-full"
            style={{
              width: `${resultado.puntaje}%`,
              background: resultado.aprobado ? "linear-gradient(90deg, var(--accent), var(--primary-light))" : "#ef4444",
            }} />
        </div>
        <button onClick={() => { setResultado(null); setRespuestas({}); }}
          className="btn-ghost mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado + progreso de respuestas */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif-brand text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{titulo}</h2>
          <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-faint)" }}>
            {contestadas}/{preguntas.length} respondidas
          </span>
        </div>
        <div className="progress-track mt-3 h-1.5 w-full">
          <div className="progress-bar h-full" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {preguntas.map((p, i) => (
        <div key={p.id} className={`card animate-rise rise-${(i % 5) + 1} p-6`}>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text)" }}>{p.enunciado}</p>
              {p.tipo === "multiple" && (
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Selección múltiple
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {p.opciones.map((o) => {
              const selected = (respuestas[p.id] ?? []).includes(o.id);
              return (
                <button key={o.id} onClick={() => toggle(p.id, o.id, p.tipo === "multiple")}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-200 hover:-translate-y-px active:scale-[0.99]"
                  style={{
                    background: selected ? "var(--primary-dim)" : "var(--surface-2)",
                    border: `1.5px solid ${selected ? "var(--primary)" : "transparent"}`,
                    color: "var(--text)",
                    boxShadow: selected ? "var(--shadow-xs)" : "none",
                  }}>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-all duration-200 ${p.tipo === "multiple" ? "rounded-md" : "rounded-full"}`}
                    style={{
                      borderColor: selected ? "var(--primary)" : "var(--border-strong)",
                      background: selected ? "var(--primary)" : "var(--surface)",
                    }}>
                    {selected && <Check className="h-3 w-3" style={{ color: "var(--on-primary)" }} />}
                  </span>
                  {o.texto}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <p className="rounded-xl px-4 py-3 text-xs"
          style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}>
          {error}
        </p>
      )}

      <button onClick={enviar} disabled={loading || contestadas === 0}
        className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? "Calificando…" : "Enviar respuestas"}
      </button>
    </div>
  );
}
