/**
 * Guarda retroalimentación docente para un intento. El cliente no puede
 * modificar puntajes ni respuestas: el permiso del profesor se valida aquí.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Curso, Profile, Quiz, QuizIntento } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { intentoId?: string; feedback?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  if (!body.intentoId || typeof body.feedback !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const feedback = body.feedback.trim();
  if (feedback.length > 4_000) return NextResponse.json({ error: "feedback_too_long" }, { status: 400 });

  const { data: intentoRaw } = await admin
    .from("quiz_intentos")
    .select("id, quiz_id")
    .eq("id", body.intentoId)
    .maybeSingle();
  const intento = intentoRaw as Pick<QuizIntento, "id" | "quiz_id"> | null;
  if (!intento) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [{ data: quizRaw }, { data: profileRaw }] = await Promise.all([
    admin.from("quizzes").select("curso_id").eq("id", intento.quiz_id).single(),
    admin.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
  ]);
  const quiz = quizRaw as Pick<Quiz, "curso_id"> | null;
  const profile = profileRaw as Pick<Profile, "rol"> | null;
  if (!quiz) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: cursoRaw } = await admin.from("cursos").select("profesor_id").eq("id", quiz.curso_id).single();
  const curso = cursoRaw as Pick<Curso, "profesor_id"> | null;
  if (!curso || (curso.profesor_id !== user.id && profile?.rol !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("quiz_intentos").update({
    feedback_docente: feedback || null,
    revisado_at: new Date().toISOString(),
    revisado_por: user.id,
  } as never).eq("id", intento.id);
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  return NextResponse.json({ feedback: feedback || null });
}
