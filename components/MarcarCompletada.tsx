"use client";

/**
 * Botón para marcar/desmarcar una lección como completada.
 * Hace upsert en progreso_lecciones (RLS: el alumno gestiona lo suyo).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function MarcarCompletada({ leccionId, cursoId, completed: initial }: {
  leccionId: string; cursoId: string; completed: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const next = !done;
    setBusy(true); setError(null);
    const { error } = await supabase
      .from("progreso_lecciones")
      .upsert(
        { alumno_id: user.id, leccion_id: leccionId, curso_id: cursoId, completada: next, ultima_vista: new Date().toISOString() } as never,
        { onConflict: "alumno_id,leccion_id" }
      );
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button onClick={toggle} disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
        style={done
          ? { background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }
          : { background: "linear-gradient(135deg, var(--primary), var(--primary-light))", color: "var(--on-primary)", boxShadow: "var(--shadow-sm)" }}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        {busy ? "Guardando…" : done ? "Completada" : "Marcar como completada"}
      </button>
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
