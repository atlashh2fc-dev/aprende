"use client";

/**
 * Acompañante de estudio contextual. Se mantiene lateral en escritorio para
 * acompañar la lección sin competir con el contenido ni interrumpir al alumno.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Lightbulb, Loader2, MessageCircleQuestion, Send } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

const PROMPTS = [
  { label: "Comprobar comprensión", text: "Hazme una pregunta breve para comprobar si entendí esta lección.", icon: CheckCircle2 },
  { label: "Necesito una pista", text: "Dame una pista para entender la idea principal de esta lección, sin darme toda la respuesta.", icon: Lightbulb },
  { label: "Ver un ejemplo", text: "Explícame esta lección con un ejemplo práctico y breve.", icon: ArrowUpRight },
];

export function TutorChat({ cursoId, cursoTitulo }: { cursoId: string; cursoTitulo?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setError(null); setOpen(true);
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || (data.error === "ai_no_config" ? "El acompañante aún no está configurado." : "No se pudo responder."));
        return;
      }
      setMsgs((current) => [...current, { role: "assistant", content: data.answer || "…" }]);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function send(event: React.FormEvent) { event.preventDefault(); void ask(input); }

  return (
    <aside className="card overflow-hidden" aria-label="Copiloto IA de estudio">
      <div className="relative h-32 overflow-hidden px-5 py-5" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, var(--surface)), var(--surface))" }}>
        <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full blur-3xl" style={{ background: "var(--primary-glow)" }} />
        <div className="absolute -right-5 -top-5 h-40 w-40 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/avatars/study-companion-core.png" alt="Núcleo visual del Copiloto IA" className="animate-companion-float pointer-events-none absolute -right-7 -top-7 z-10 h-[154px] w-auto max-w-none object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.24)]" />
        <div className="relative z-20 max-w-[60%]">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Asistencia contextual</p>
          <h2 className="mt-2 font-serif-brand text-xl font-bold leading-tight" style={{ color: "var(--text)" }}>Copiloto IA</h2>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>Una ayuda breve, cuando la necesites.</p>
        </div>
      </div>

      {!open ? (
        <div className="p-5">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            ¿La idea central te hizo sentido? Puedo ayudarte a ponerla a prueba o verla desde otro ángulo.
          </p>
          <div className="mt-4 grid gap-2">
            {PROMPTS.map(({ label, text, icon: Icon }) => (
              <button key={label} type="button" onClick={() => void ask(text)} disabled={busy}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--primary)" }} /> {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(true)} className="mt-4 text-xs font-semibold" style={{ color: "var(--primary)" }}>Hacer otra pregunta</button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="max-h-[22rem] overflow-y-auto px-5 py-4">
            {msgs.length === 0 && (
              <div className="rounded-lg p-3.5 text-sm leading-relaxed" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                Estoy aquí para ayudarte con <strong style={{ color: "var(--text)" }}>{cursoTitulo ?? "esta lección"}</strong>. ¿Qué parte quieres revisar?
              </div>
            )}
            <div className="grid gap-3">
              {msgs.map((message, index) => (
                <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <span className="max-w-[92%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={message.role === "user" ? { background: "var(--primary)", color: "var(--on-primary)" } : { background: "var(--surface-2)", color: "var(--text)" }}>
                    {message.content}
                  </span>
                </div>
              ))}
              {busy && <div className="flex justify-start"><span className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}><Loader2 className="h-4 w-4 animate-spin" /> Pensando…</span></div>}
            </div>
          </div>
          <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
            <form onSubmit={send} className="flex gap-2">
              <input value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} placeholder="Escribe tu duda…" className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-50" aria-label="Enviar pregunta"><Send className="h-4 w-4" /></button>
            </form>
            <button type="button" onClick={() => setOpen(false)} className="mt-3 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold" style={{ color: "var(--text-faint)" }}><MessageCircleQuestion className="h-3.5 w-3.5" /> Ver opciones de ayuda</button>
          </div>
        </>
      )}
      {error && <p className="border-t px-5 py-3 text-xs" style={{ borderColor: "var(--border)", color: "#b42318" }}>{error}</p>}
    </aside>
  );
}
