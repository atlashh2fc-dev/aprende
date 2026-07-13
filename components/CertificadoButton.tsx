"use client";

/**
 * Emite el certificado del curso (si el alumno lo completó) y navega a la
 * página pública del certificado. La verificación de completitud es del servidor.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";

export function CertificadoButton({ cursoId }: { cursoId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function emitir() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/certificado/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "curso_incompleto" ? "Completa todas las lecciones primero." : "No se pudo emitir el certificado.");
        setBusy(false);
        return;
      }
      router.push(`/certificado/${data.codigo}`);
    } catch {
      setBusy(false);
      setError("Error de red. Intenta de nuevo.");
    }
  }

  return (
    <div>
      <button onClick={emitir} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-px disabled:opacity-60"
        style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
        {busy ? "Emitiendo…" : "Obtener certificado"}
      </button>
      {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
