"use client";

import { useState } from "react";
import { BookMarked, Check, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LessonNotes({ cursoId, leccionId, initialContent = "" }: {
  cursoId: string;
  leccionId: string;
  initialContent?: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = content !== savedContent;

  async function save() {
    const supabase = createClient();
    if (!supabase || busy) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setBusy(true); setError(null);
    const { error: saveError } = await supabase.from("notas_leccion").upsert({
      alumno_id: user.id,
      curso_id: cursoId,
      leccion_id: leccionId,
      contenido: content,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "alumno_id,leccion_id" });
    setBusy(false);
    if (saveError) { setError("No se pudo guardar la nota. Inténtalo nuevamente."); return; }
    setSavedContent(content);
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}><BookMarked className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Mis apuntes</h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>Privados para ti · asociados a esta lección</p>
          </div>
        </div>
        {!changed && savedContent && <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold" style={{ color: "var(--accent)" }}><Check className="h-3.5 w-3.5" /> Guardado</span>}
      </div>
      <div className="p-5">
        <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000}
          placeholder="Escribe ideas, dudas, ejemplos o próximos pasos que quieras recordar…"
          className="min-h-32 w-full resize-y rounded-lg p-3.5 text-sm leading-relaxed outline-none transition-colors"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[0.68rem] tabular-nums" style={{ color: "var(--text-faint)" }}>{content.length.toLocaleString("es-CL")} / 20.000</span>
          <button type="button" onClick={save} disabled={busy || !changed} className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {busy ? "Guardando" : "Guardar apuntes"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs" style={{ color: "#b42318" }}>{error}</p>}
      </div>
    </section>
  );
}
