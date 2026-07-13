/**
 * Califica un intento de quiz EN EL SERVIDOR.
 * El cliente nunca recibe qué opción es correcta: se resuelve aquí con el
 * cliente service_role y se guarda el intento.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Quiz, QuizPregunta, QuizOpcion, QuizIntento } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { quizId?: string; respuestas?: Record<string, string[]> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const { quizId, respuestas = {} } = body;
  if (!quizId) return NextResponse.json({ error: "missing_quiz" }, { status: 400 });

  const { data: quizRaw } = await admin.from("quizzes").select("id, curso_id, aprobacion_min").eq("id", quizId).single();
  const quiz = quizRaw as Pick<Quiz, "id" | "curso_id" | "aprobacion_min"> | null;
  if (!quiz) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Un alumno solo puede rendir evaluaciones de cursos en los que está inscrito.
  // Esta comprobación usa el cliente de sesión para respetar las reglas RLS.
  const { data: inscripcion } = await supabase
    .from("inscripciones")
    .select("id")
    .eq("alumno_id", user.id)
    .eq("curso_id", quiz.curso_id)
    .maybeSingle();
  if (!inscripcion) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });

  const { data: preguntasRaw } = await admin.from("quiz_preguntas").select("id").eq("quiz_id", quizId);
  const preguntas = (preguntasRaw as Pick<QuizPregunta, "id">[] | null) ?? [];
  if (preguntas.length === 0) return NextResponse.json({ error: "empty_quiz" }, { status: 400 });

  const { data: opcionesRaw } = await admin
    .from("quiz_opciones")
    .select("id, pregunta_id, es_correcta")
    .in("pregunta_id", preguntas.map((p) => p.id));
  const opciones = (opcionesRaw as Pick<QuizOpcion, "id" | "pregunta_id" | "es_correcta">[] | null) ?? [];

  const correctasPorPregunta = new Map<string, Set<string>>();
  for (const o of opciones) {
    if (!correctasPorPregunta.has(o.pregunta_id)) correctasPorPregunta.set(o.pregunta_id, new Set());
    if (o.es_correcta) correctasPorPregunta.get(o.pregunta_id)!.add(o.id);
  }

  // No se debe calificar una configuración incompleta como si fuese un 0% del alumno.
  if (preguntas.some((p) => (correctasPorPregunta.get(p.id)?.size ?? 0) === 0)) {
    return NextResponse.json({ error: "invalid_quiz_config" }, { status: 422 });
  }

  let correctas = 0;
  for (const p of preguntas) {
    const esperado = correctasPorPregunta.get(p.id) ?? new Set<string>();
    const dado = new Set(respuestas[p.id] ?? []);
    const igual = esperado.size === dado.size && [...esperado].every((id) => dado.has(id));
    if (igual) correctas++;
  }

  const puntaje = Math.round((correctas / preguntas.length) * 100);
  const aprobado = puntaje >= quiz.aprobacion_min;

  const intento: Partial<QuizIntento> = { alumno_id: user.id, quiz_id: quizId, puntaje, aprobado, respuestas };
  await admin.from("quiz_intentos").insert(intento as never);

  return NextResponse.json({ puntaje, aprobado, correctas, total: preguntas.length });
}
