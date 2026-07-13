"use client";

/**
 * Gestor de módulos de un curso (admin/profesor). Crear, renombrar y eliminar
 * módulos para agrupar lecciones. Escribe directo a Supabase (RLS del dueño/admin).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Modulo } from "@/lib/supabase/database.types";

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;

export function ModulosManager({ cursoId, modulos, leccionesPorModulo }: {
  cursoId: string; modulos: Modulo[]; leccionesPorModulo: Record<string, number>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [titulo, setTitulo] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addModulo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titulo.trim()) { setError("Escribe el nombre del módulo."); return; }
    if (!supabase) return;
    const orden = modulos.length ? Math.max(...modulos.map((m) => m.orden)) + 1 : 0;
    setAdding(true);
    const { error } = await supabase.from("modulos").insert({ curso_id: cursoId, titulo: titulo.trim(), orden } as never);
    setAdding(false);
    if (error) { setError(error.message); return; }
    setTitulo(""); router.refresh();
  }

  async function removeModulo(id: string) {
    if (!supabase) return;
    setBusy(id); setError(null);
    // Las lecciones quedan sin módulo (FK ON DELETE SET NULL en el esquema).
    const { error } = await supabase.from("modulos").delete().eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function moverModulo(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const actual = modulos[index];
    const destino = modulos[targetIndex];
    if (!supabase || !actual || !destino) return;
    setBusy(actual.id); setError(null);
    const first = await supabase.from("modulos").update({ orden: destino.orden } as never).eq("id", actual.id);
    if (first.error) { setBusy(null); setError(first.error.message); return; }
    const second = await supabase.from("modulos").update({ orden: actual.orden } as never).eq("id", destino.id);
    setBusy(null);
    if (second.error) { setError(second.error.message); return; }
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="card p-2">
        {modulos.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Sin módulos. Créalos para agrupar las lecciones (opcional).
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {modulos.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{m.titulo}</p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {leccionesPorModulo[m.id] ?? 0} lecciones
                  </p>
                </div>
                <div className="hidden items-center sm:flex">
                  <button onClick={() => moverModulo(i, -1)} disabled={i === 0 || busy === m.id}
                    className="flex h-8 w-7 items-center justify-center rounded-lg disabled:opacity-30" aria-label="Subir módulo">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moverModulo(i, 1)} disabled={i === modulos.length - 1 || busy === m.id}
                    className="flex h-8 w-7 items-center justify-center rounded-lg disabled:opacity-30" aria-label="Bajar módulo">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button onClick={() => removeModulo(m.id)} disabled={busy === m.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: "#dc2626" }}
                  aria-label="Eliminar módulo">
                  {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={addModulo} className="flex gap-2">
        <input className={inputCls} style={inputStyle} value={titulo}
          onChange={(e) => setTitulo(e.target.value)} placeholder="Nombre del módulo (ej. Fundamentos)" />
        <button type="submit" disabled={adding}
          className="btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs disabled:opacity-60">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Módulo
        </button>
      </form>
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
        <Layers className="h-3.5 w-3.5" /> Asigna cada lección a un módulo desde la lista de lecciones.
      </p>
    </div>
  );
}
