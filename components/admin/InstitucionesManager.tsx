"use client";

/**
 * Mantenedor de instituciones (admin): crear, renombrar y eliminar cohortes.
 * Escribe a `instituciones` con RLS de admin. Al eliminar, los usuarios y cursos
 * quedan sin institución (FK ON DELETE SET NULL).
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Building2, Users, BookOpen, ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface InstRow {
  id: string; nombre: string; slug: string;
  alumnos: number; cursos: number; supervisores: number;
}

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 40);
}

export function InstitucionesManager({ instituciones: initial }: { instituciones: InstRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<InstRow[]>(initial);
  const [nombre, setNombre] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) { setError("Escribe el nombre de la institución."); return; }
    if (!supabase) return;
    setAdding(true);
    const slug = slugify(nombre) || "institucion";
    const { data, error } = await supabase.from("instituciones")
      .insert({ nombre: nombre.trim(), slug } as never).select("id, nombre, slug").single();
    setAdding(false);
    if (error) { setError(error.message.includes("duplicate") ? "Ya existe una institución con ese nombre/slug." : error.message); return; }
    const row = data as { id: string; nombre: string; slug: string };
    setItems((p) => [...p, { ...row, alumnos: 0, cursos: 0, supervisores: 0 }]);
    setNombre(""); router.refresh();
  }

  async function renombrar(id: string, nuevo: string) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error } = await supabase.from("instituciones")
      .update({ nombre: nuevo, slug: slugify(nuevo) } as never).eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function eliminar(id: string) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error } = await supabase.from("instituciones").delete().eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    setItems((p) => p.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {error && (
        <p className="rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}>{error}</p>
      )}

      {/* Alta */}
      <form onSubmit={crear} className="flex gap-2">
        <input className={inputCls} style={inputStyle} value={nombre}
          onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la institución (ej. Colegio San Andrés)" />
        <button type="submit" disabled={adding}
          className="btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs disabled:opacity-60">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear
        </button>
      </form>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8" style={{ color: "var(--text-faint)" }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Aún no hay instituciones.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((i) => (
            <div key={i.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))", color: "var(--primary)" }}>
                  <Building2 className="h-5 w-5" />
                </span>
                <button onClick={() => eliminar(i.id)} disabled={busy === i.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: "#dc2626" }}
                  aria-label="Eliminar institución">
                  {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
              <input defaultValue={i.nombre}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== i.nombre) renombrar(i.id, v); }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="mt-3 w-full bg-transparent text-sm font-semibold outline-none"
                style={{ color: "var(--text)" }} />
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>/{i.slug}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {i.alumnos} alumnos</span>
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {i.cursos} cursos</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {i.supervisores} superv.</span>
              </div>
              <Link href={`/admin/instituciones/${i.id}`}
                className="btn-ghost mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs">
                Ver detalle <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Los supervisores se asignan desde <strong style={{ color: "var(--text-muted)" }}>Usuarios</strong>. Eliminar una institución deja a sus usuarios y cursos sin cohorte.
      </p>
    </div>
  );
}
