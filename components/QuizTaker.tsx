"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

  function toggle(preguntaId: string, opcionId: string, multiple: boolean) {
    setRespuestas((prev) => {
      const actual = new Set(prev[preguntaId] ?? []);
      if (multiple) {
        actual.has(opcionId) ? actual.delete(opcionId) : actual.add(opcionId);
      } else {
        actual.clear(); actual.add(opcionId);
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
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: resultado.aprobado ? "rgba(74,222,128,0.14)" : "rgba(239,68,68,0.12)" }}>
          {resultado.aprobado
            ? <CheckCircle2 className="h-8 w-8" style={{ color: "#4ade80" }} />
            : <XCircle className="h-8 w-8" style={{ color: "#f87171" }} />}
        </span>
        <p className="mt-4 font-serif-brand text-3xl font-bold" style={{ color: "var(--text)" }}>{resultado.puntaje}%</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {resultado.correctas} de {resultado.total} correctas · {resultado.aprobado ? "¡Aprobado!" : "No aprobado"}
        </p>
        <button onClick={() => { setResultado(null); setRespuestas({}); }}
          className="btn-ghost mt-6 rounded-lg px-5 py-2.5 text-xs">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif-brand text-xl font-bold" style={{ color: "var(--text)" }}>{titulo}</h2>
      {preguntas.map((p, i) => (
        <div key={p.id} className="card p-6">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            <span style={{ color: "var(--text-faint)" }}>{i + 1}. </span>{p.enunciado}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {p.opciones.map((o) => {
              const selected = (respuestas[p.id] ?? []).includes(o.id);
              return (
                <button key={o.id} onClick={() => toggle(p.id, o.id, p.tipo === "multiple")}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors"
                  style={{
                    background: selected ? "var(--primary-dim)" : "var(--surface-2)",
                    border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                    color: "var(--text)",
                  }}>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                    style={{ borderColor: selected ? "var(--primary)" : "var(--border-strong)", background: selected ? "var(--primary)" : "transparent" }} />
                  {o.texto}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {error && <p className="text-xs" style={{ color: "#fca5a5" }}>{error}</p>}
      <button onClick={enviar} disabled={loading}
        className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-xs disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar respuestas
      </button>
    </div>
  );
}
