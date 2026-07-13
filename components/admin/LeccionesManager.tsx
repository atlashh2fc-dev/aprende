"use client";

/**
 * Gestor de lecciones de un curso (admin). Listar, agregar y eliminar.
 * Escribe directo a Supabase; RLS permite la escritura por ser admin.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Video, FileText, HelpCircle, GripVertical, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Leccion, LeccionTipo } from "@/lib/supabase/database.types";

const TIPOS: { value: LeccionTipo; label: string; icon: typeof Video }[] = [
  { value: "video", label: "Video", icon: Video },
  { value: "texto", label: "Texto", icon: FileText },
  { value: "quiz", label: "Quiz", icon: HelpCircle },
];

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;

export function LeccionesManager({ cursoId, lecciones, modulos = [], basePath = "/admin/cursos" }: {
  cursoId: string; lecciones: Leccion[]; modulos?: { id: string; titulo: string }[]; basePath?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<LeccionTipo>("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [contenido, setContenido] = useState("");
  const [duracion, setDuracion] = useState(0);
  const [moduloId, setModuloId] = useState("");

  const nextOrden = lecciones.length ? Math.max(...lecciones.map((l) => l.orden)) + 1 : 0;

  async function addLeccion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titulo.trim()) { setError("El título de la lección es obligatorio."); return; }
    const supabase = createClient();
    if (!supabase) { setError("Supabase no está configurado."); return; }
    const payload = {
      curso_id: cursoId,
      titulo: titulo.trim(),
      tipo,
      video_url: tipo === "video" ? videoUrl.trim() || null : null,
      contenido: tipo === "texto" ? contenido.trim() || null : null,
      duracion_min: Number(duracion) || 0,
      orden: nextOrden,
      modulo_id: moduloId || null,
    };
    setAdding(true);
    const { error } = await supabase.from("lecciones").insert(payload as never);
    setAdding(false);
    if (error) { setError(error.message); return; }
    setTitulo(""); setVideoUrl(""); setContenido(""); setDuracion(0); setTipo("video"); setModuloId("");
    router.refresh();
  }

  async function assignModulo(leccionId: string, value: string) {
    setBusy(leccionId); setError(null);
    const supabase = createClient();
    if (!supabase) { setBusy(null); return; }
    const { error } = await supabase.from("lecciones").update({ modulo_id: value || null } as never).eq("id", leccionId);
    setBusy(null);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function removeLeccion(id: string) {
    setBusy(id);
    const supabase = createClient();
    if (!supabase) { setBusy(null); return; }
    const { error } = await supabase.from("lecciones").delete().eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      {/* Lista */}
      <div className="card p-2">
        {lecciones.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Aún no hay lecciones. Agrega la primera abajo.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {lecciones.map((l) => {
              const T = TIPOS.find((t) => t.value === l.tipo) ?? TIPOS[0];
              return (
                <li key={l.id} className="flex items-center gap-3 px-3 py-3">
                  <GripVertical className="h-4 w-4 shrink-0" style={{ color: "var(--text-faint)" }} />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                    <T.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{l.titulo}</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {T.label}{l.duracion_min ? ` · ${l.duracion_min} min` : ""}
                    </p>
                  </div>
                  {modulos.length > 0 && (
                    <select value={l.modulo_id ?? ""} disabled={busy === l.id}
                      onChange={(e) => assignModulo(l.id, e.target.value)}
                      className="hidden shrink-0 rounded-lg px-2 py-1.5 text-xs sm:block"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
                      title="Módulo">
                      <option value="">Sin módulo</option>
                      {modulos.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                    </select>
                  )}
                  {l.tipo === "quiz" && (
                    <Link href={`${basePath}/${cursoId}/leccion/${l.id}/quiz`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                      <ListChecks className="h-3.5 w-3.5" /> Preguntas
                    </Link>
                  )}
                  <button onClick={() => removeLeccion(l.id)} disabled={busy === l.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
                    style={{ color: "#dc2626" }} aria-label="Eliminar lección">
                    {busy === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Alta */}
      <form onSubmit={addLeccion} className="card p-5 sm:p-6">
        <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Agregar lección</p>
        <div className="grid gap-4">
          <input className={inputCls} style={inputStyle} value={titulo}
            onChange={(e) => setTitulo(e.target.value)} placeholder="Título de la lección" />

          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => {
              const active = tipo === t.value;
              return (
                <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                  className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all"
                  style={active
                    ? { background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)" }
                    : { background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {tipo === "video" && (
            <input className={inputCls} style={inputStyle} value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL del video (YouTube, Vimeo, MP4…)" />
          )}
          {tipo === "texto" && (
            <textarea rows={4} className={inputCls} style={inputStyle} value={contenido}
              onChange={(e) => setContenido(e.target.value)} placeholder="Contenido de la lección (texto / markdown)" />
          )}
          {tipo === "quiz" && (
            <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
              Crea la lección y luego arma las preguntas del quiz asociado.
            </p>
          )}

          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <input type="number" min={0} className={inputCls} style={inputStyle} value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))} placeholder="Duración (min)" />
            </div>
            {modulos.length > 0 && (
              <div className="min-w-48 flex-1">
                <select value={moduloId} onChange={(e) => setModuloId(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">Sin módulo</option>
                  {modulos.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}>
              {error}
            </p>
          )}

          <div>
            <button type="submit" disabled={adding}
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs disabled:opacity-60">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {adding ? "Agregando…" : "Agregar lección"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
