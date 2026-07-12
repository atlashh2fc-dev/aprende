"use client";

/**
 * Formulario de creación / edición de curso (admin).
 * Escribe directo a Supabase con el cliente de navegador; las políticas RLS
 * permiten la escritura porque el usuario es admin (is_admin()).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Curso, CursoEstado } from "@/lib/supabase/database.types";

type CursoFields = Pick<
  Curso,
  "slug" | "titulo" | "descripcion_corta" | "descripcion" | "imagen_url" | "nivel" | "categoria" | "duracion_horas" | "estado"
>;

const NIVELES = ["Básico", "Intermedio", "Avanzado"];
const ESTADOS: { value: CursoEstado; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "publicado", label: "Publicado" },
  { value: "archivado", label: "Archivado" },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

const inputCls =
  "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[color:var(--primary)]";
const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-strong)",
  color: "var(--text)",
} as const;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
      {children}
    </label>
  );
}

export function CursoForm({ mode, curso }: { mode: "create" | "edit"; curso?: Curso }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const [f, setF] = useState<CursoFields>({
    slug: curso?.slug ?? "",
    titulo: curso?.titulo ?? "",
    descripcion_corta: curso?.descripcion_corta ?? "",
    descripcion: curso?.descripcion ?? "",
    imagen_url: curso?.imagen_url ?? "",
    nivel: curso?.nivel ?? "",
    categoria: curso?.categoria ?? "",
    duracion_horas: curso?.duracion_horas ?? 0,
    estado: curso?.estado ?? "borrador",
  });

  function set<K extends keyof CursoFields>(key: K, value: CursoFields[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function onTitulo(value: string) {
    set("titulo", value);
    if (!slugTouched) set("slug", slugify(value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.titulo.trim()) { setError("El título es obligatorio."); return; }
    const supabase = createClient();
    if (!supabase) { setError("Supabase no está configurado."); return; }

    const payload: CursoFields = {
      ...f,
      slug: (f.slug.trim() || slugify(f.titulo)),
      titulo: f.titulo.trim(),
      descripcion_corta: f.descripcion_corta?.trim() || null,
      descripcion: f.descripcion?.trim() || null,
      imagen_url: f.imagen_url?.trim() || null,
      nivel: f.nivel?.trim() || null,
      categoria: f.categoria?.trim() || null,
      duracion_horas: Number(f.duracion_horas) || 0,
    };

    setSaving(true);
    if (mode === "create") {
      const { data, error } = await supabase
        .from("cursos")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) { setSaving(false); setError(friendly(error.message)); return; }
      const id = (data as { id: string }).id;
      router.push(`/admin/cursos/${id}`);
      router.refresh();
    } else {
      const { error } = await supabase
        .from("cursos")
        .update(payload as never)
        .eq("id", curso!.id);
      if (error) { setSaving(false); setError(friendly(error.message)); return; }
      setSaving(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <div className="grid gap-5">
        <div>
          <Label>Título *</Label>
          <input className={inputCls} style={inputStyle} value={f.titulo}
            onChange={(e) => onTitulo(e.target.value)} placeholder="Introducción a la automatización" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Slug (URL)</Label>
            <input className={inputCls} style={inputStyle} value={f.slug}
              onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
              placeholder="intro-automatizacion" />
          </div>
          <div>
            <Label>Categoría</Label>
            <input className={inputCls} style={inputStyle} value={f.categoria ?? ""}
              onChange={(e) => set("categoria", e.target.value)} placeholder="Tecnología" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label>Nivel</Label>
            <select className={inputCls} style={inputStyle} value={f.nivel ?? ""}
              onChange={(e) => set("nivel", e.target.value)}>
              <option value="">—</option>
              {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label>Duración (horas)</Label>
            <input type="number" min={0} step={0.5} className={inputCls} style={inputStyle}
              value={f.duracion_horas ?? 0} onChange={(e) => set("duracion_horas", Number(e.target.value))} />
          </div>
          <div>
            <Label>Estado</Label>
            <select className={inputCls} style={inputStyle} value={f.estado}
              onChange={(e) => set("estado", e.target.value as CursoEstado)}>
              {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label>Descripción corta</Label>
          <input className={inputCls} style={inputStyle} value={f.descripcion_corta ?? ""}
            onChange={(e) => set("descripcion_corta", e.target.value)}
            placeholder="Una línea que resume el curso." />
        </div>

        <div>
          <Label>Descripción completa</Label>
          <textarea rows={5} className={inputCls} style={inputStyle} value={f.descripcion ?? ""}
            onChange={(e) => set("descripcion", e.target.value)}
            placeholder="Detalle de lo que aprenderá el alumno…" />
        </div>

        <div>
          <Label>Imagen de portada (URL)</Label>
          <input className={inputCls} style={inputStyle} value={f.imagen_url ?? ""}
            onChange={(e) => set("imagen_url", e.target.value)} placeholder="https://…" />
        </div>

        {error && (
          <p className="rounded-lg px-3 py-2 text-xs"
            style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-xs disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Guardando…" : mode === "create" ? "Crear curso" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}

function friendly(msg: string): string {
  if (msg.includes("duplicate") || msg.includes("unique")) return "Ya existe un curso con ese slug. Cámbialo.";
  return msg;
}
