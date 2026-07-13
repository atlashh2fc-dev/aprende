"use client";

/**
 * Constructor de quizzes (admin/profesor). Autoría de preguntas y opciones
 * para el quiz de una lección. Escribe directo a Supabase; RLS permite la
 * escritura al dueño del curso o a un admin. Cada cambio persiste al momento
 * y refresca los datos del servidor.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, CheckCircle2, Circle, HelpCircle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Quiz, PreguntaTipo } from "@/lib/supabase/database.types";

export interface OpcionRow { id: string; texto: string; es_correcta: boolean; orden: number }
export interface PreguntaRow { id: string; enunciado: string; tipo: PreguntaTipo; orden: number; opciones: OpcionRow[] }

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;

function toDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function QuizBuilder({
  cursoId, leccionId, leccionTitulo, quiz, preguntas,
}: {
  cursoId: string; leccionId: string; leccionTitulo: string;
  quiz: Quiz | null; preguntas: PreguntaRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado del alta de quiz / de pregunta
  const [quizTitulo, setQuizTitulo] = useState(quiz?.titulo ?? leccionTitulo);
  const [aprobacion, setAprobacion] = useState(quiz?.aprobacion_min ?? 60);
  const [fechaLimite, setFechaLimite] = useState(toDateTimeInput(quiz?.fecha_limite));
  const [intentosMaximos, setIntentosMaximos] = useState(quiz?.intentos_maximos?.toString() ?? "");
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<PreguntaTipo>("unica");
  const [nuevaOpcion, setNuevaOpcion] = useState<Record<string, string>>({});

  function fail(msg: string) { setError(msg); setBusy(null); }

  function quizPayload() {
    const intentos = intentosMaximos.trim() === "" ? null : Number(intentosMaximos);
    if (intentos !== null && (!Number.isInteger(intentos) || intentos < 1)) return null;
    return {
      curso_id: cursoId,
      leccion_id: leccionId,
      titulo: quizTitulo.trim() || leccionTitulo,
      aprobacion_min: Math.min(100, Math.max(0, Number(aprobacion) || 60)),
      fecha_limite: fechaLimite ? new Date(fechaLimite).toISOString() : null,
      intentos_maximos: intentos,
    };
  }

  async function crearQuiz() {
    if (!supabase) return;
    setBusy("quiz"); setError(null);
    const payload = quizPayload();
    if (!payload) return fail("Los intentos deben ser un número entero mayor que cero.");
    const { error } = await supabase.from("quizzes").insert(payload as never);
    if (error) return fail(error.message);
    setBusy(null); router.refresh();
  }

  async function guardarQuiz() {
    if (!supabase || !quiz) return;
    setBusy("quiz"); setError(null);
    const payload = quizPayload();
    if (!payload) return fail("Los intentos deben ser un número entero mayor que cero.");
    const { curso_id: _cursoId, leccion_id: _leccionId, ...settings } = payload;
    const { error } = await supabase.from("quizzes")
      .update(settings as never)
      .eq("id", quiz.id);
    if (error) return fail(error.message);
    setBusy(null); router.refresh();
  }

  async function agregarPregunta() {
    if (!supabase || !quiz) return;
    if (!nuevaPregunta.trim()) return fail("Escribe el enunciado.");
    setBusy("pregunta"); setError(null);
    const orden = preguntas.length ? Math.max(...preguntas.map((p) => p.orden)) + 1 : 0;
    const { error } = await supabase.from("quiz_preguntas")
      .insert({ quiz_id: quiz.id, enunciado: nuevaPregunta.trim(), tipo: nuevoTipo, orden } as never);
    if (error) return fail(error.message);
    setNuevaPregunta(""); setNuevoTipo("unica"); setBusy(null); router.refresh();
  }

  async function eliminarPregunta(id: string) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error } = await supabase.from("quiz_preguntas").delete().eq("id", id);
    if (error) return fail(error.message);
    setBusy(null); router.refresh();
  }

  async function agregarOpcion(preguntaId: string) {
    if (!supabase) return;
    const texto = (nuevaOpcion[preguntaId] ?? "").trim();
    if (!texto) return;
    setBusy(`opt-${preguntaId}`); setError(null);
    const preg = preguntas.find((p) => p.id === preguntaId);
    const orden = preg && preg.opciones.length ? Math.max(...preg.opciones.map((o) => o.orden)) + 1 : 0;
    const { error } = await supabase.from("quiz_opciones")
      .insert({ pregunta_id: preguntaId, texto, es_correcta: false, orden } as never);
    if (error) return fail(error.message);
    setNuevaOpcion((s) => ({ ...s, [preguntaId]: "" })); setBusy(null); router.refresh();
  }

  async function eliminarOpcion(id: string) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error } = await supabase.from("quiz_opciones").delete().eq("id", id);
    if (error) return fail(error.message);
    setBusy(null); router.refresh();
  }

  async function marcarCorrecta(pregunta: PreguntaRow, opcionId: string, valor: boolean) {
    if (!supabase) return;
    setBusy(opcionId); setError(null);
    if (pregunta.tipo === "unica") {
      // Exclusiva: apaga todas y prende la elegida.
      await supabase.from("quiz_opciones").update({ es_correcta: false } as never).eq("pregunta_id", pregunta.id);
      const { error } = await supabase.from("quiz_opciones").update({ es_correcta: true } as never).eq("id", opcionId);
      if (error) return fail(error.message);
    } else {
      const { error } = await supabase.from("quiz_opciones").update({ es_correcta: valor } as never).eq("id", opcionId);
      if (error) return fail(error.message);
    }
    setBusy(null); router.refresh();
  }

  // ── Sin quiz: crear ──────────────────────────────────────────
  if (!quiz) {
    return (
      <div className="card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5" style={{ color: "var(--primary)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Crear quiz para esta lección</p>
        </div>
        <div className="grid gap-4">
          <input className={inputCls} style={inputStyle} value={quizTitulo}
            onChange={(e) => setQuizTitulo(e.target.value)} placeholder="Título del quiz" />
          <div className="w-56">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>% mínimo para aprobar</label>
            <input type="number" min={0} max={100} className={inputCls} style={inputStyle}
              value={aprobacion} onChange={(e) => setAprobacion(Number(e.target.value))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Fecha límite (opcional)</label>
              <input type="datetime-local" className={inputCls} style={inputStyle} value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Máximo de intentos</label>
              <input type="number" min={1} className={inputCls} style={inputStyle} value={intentosMaximos}
                onChange={(e) => setIntentosMaximos(e.target.value)} placeholder="Sin límite" />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div>
            <button onClick={crearQuiz} disabled={busy === "quiz"}
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs disabled:opacity-60">
              {busy === "quiz" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Con quiz: configuración + preguntas ──────────────────────
  return (
    <div className="grid gap-6">
      {/* Config del quiz */}
      <div className="card p-5 sm:p-6">
        <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Configuración</p>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Título</label>
            <input className={inputCls} style={inputStyle} value={quizTitulo} onChange={(e) => setQuizTitulo(e.target.value)} />
          </div>
          <div className="w-40">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>% aprobación</label>
            <input type="number" min={0} max={100} className={inputCls} style={inputStyle}
              value={aprobacion} onChange={(e) => setAprobacion(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Fecha límite (opcional)</label>
            <input type="datetime-local" className={inputCls} style={inputStyle} value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Máximo de intentos</label>
            <input type="number" min={1} className={inputCls} style={inputStyle} value={intentosMaximos}
              onChange={(e) => setIntentosMaximos(e.target.value)} placeholder="Sin límite" />
          </div>
        </div>
        <p className="mt-2 text-[0.68rem]" style={{ color: "var(--text-faint)" }}>Deja ambos campos vacíos para una evaluación sin cierre ni límite de intentos.</p>
        <button onClick={guardarQuiz} disabled={busy === "quiz"}
          className="btn-ghost mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs disabled:opacity-60">
          {busy === "quiz" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </button>
      </div>

      {/* Preguntas */}
      {preguntas.map((p, i) => (
        <div key={p.id} className="card p-5 sm:p-6">
          <div className="mb-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.enunciado}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {p.tipo === "unica" ? "Respuesta única" : "Respuesta múltiple"}
              </p>
            </div>
            <button onClick={() => eliminarPregunta(p.id)} disabled={busy === p.id}
              className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: "#dc2626" }}>
              {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>

          <ul className="grid gap-2 pl-9">
            {p.opciones.map((o) => (
              <li key={o.id} className="flex items-center gap-2.5">
                <button onClick={() => marcarCorrecta(p, o.id, !o.es_correcta)} disabled={busy === o.id}
                  className="shrink-0" aria-label="Marcar correcta"
                  style={{ color: o.es_correcta ? "var(--accent)" : "var(--text-faint)" }}>
                  {o.es_correcta ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
                <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>{o.texto}</span>
                <button onClick={() => eliminarOpcion(o.id)} disabled={busy === o.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: "var(--text-faint)" }}>
                  {busy === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2 pl-9">
            <input className={inputCls} style={inputStyle} value={nuevaOpcion[p.id] ?? ""}
              onChange={(e) => setNuevaOpcion((s) => ({ ...s, [p.id]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarOpcion(p.id); } }}
              placeholder="Nueva opción…" />
            <button onClick={() => agregarOpcion(p.id)} disabled={busy === `opt-${p.id}`}
              className="btn-ghost inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs disabled:opacity-60">
              <Plus className="h-3.5 w-3.5" /> Opción
            </button>
          </div>
        </div>
      ))}

      {/* Alta de pregunta */}
      <div className="card p-5 sm:p-6">
        <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Agregar pregunta</p>
        <div className="grid gap-4">
          <input className={inputCls} style={inputStyle} value={nuevaPregunta}
            onChange={(e) => setNuevaPregunta(e.target.value)} placeholder="Enunciado de la pregunta" />
          <div className="flex flex-wrap gap-2">
            {(["unica", "multiple"] as PreguntaTipo[]).map((t) => {
              const active = nuevoTipo === t;
              return (
                <button key={t} type="button" onClick={() => setNuevoTipo(t)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold transition-all"
                  style={active
                    ? { background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)" }
                    : { background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
                  {t === "unica" ? "Respuesta única" : "Respuesta múltiple"}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div>
            <button onClick={agregarPregunta} disabled={busy === "pregunta"}
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs disabled:opacity-60">
              {busy === "pregunta" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar pregunta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
