"use client";

/**
 * Tutor IA del curso. Chat que consulta /api/tutor (grounded en el contenido).
 * Panel colapsable para no distraer de la lección.
 */
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, Loader2, ChevronDown } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

export function TutorChat({ cursoId, cursoTitulo }: { cursoId: string; cursoTitulo?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setError(null);
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || (data.error === "ai_no_config" ? "El tutor aún no está configurado." : "No se pudo responder."));
        setBusy(false);
        return;
      }
      setMsgs((m) => [...m, { role: "assistant", content: data.answer || "…" }]);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    }
    setBusy(false);
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[color:var(--surface-2)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
          <MessageCircleQuestion className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Asistente de estudio</span>
          <span className="block text-xs" style={{ color: "var(--text-faint)" }}>Consulta conceptos, ejemplos o dudas de esta lección</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" style={{ color: "var(--text-faint)", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          <div ref={scrollRef} className="max-h-80 overflow-y-auto px-5 py-4">
            {msgs.length === 0 && (
              <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                Consulta al asistente sobre <strong style={{ color: "var(--text)" }}>{cursoTitulo ?? "este curso"}</strong>. Te responderá usando el contenido disponible.
              </p>
            )}
            <div className="grid gap-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <span className="max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={m.role === "user"
                      ? { background: "var(--primary)", color: "var(--on-primary)" }
                      : { background: "var(--surface-2)", color: "var(--text)" }}>
                    {m.content}
                  </span>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <span className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm"
                    style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Pensando…
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && <p className="px-5 pb-2 text-xs" style={{ color: "#dc2626" }}>{error}</p>}

          <form onSubmit={send} className="flex gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
              placeholder="Escribe tu pregunta…"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />
            <button type="submit" disabled={busy || !input.trim()}
              className="btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
