import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Curso, EntregaTarea, Profile, Tarea, TareaRubrica } from "@/lib/supabase/database.types";

type RubricValue = { rubricaId?: string; puntaje?: number; comentario?: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { entregaId?: string; puntaje?: number; feedback?: string; rubrica?: RubricValue[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  const feedback = body.feedback?.trim() || null;
  if (!body.entregaId || (feedback?.length ?? 0) > 4000 || (body.rubrica && !Array.isArray(body.rubrica))) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { data: entregaRaw } = await admin
    .from("entregas_tarea")
    .select("id,tarea_id,alumno_id")
    .eq("id", body.entregaId)
    .maybeSingle();
  const entrega = entregaRaw as Pick<EntregaTarea, "id" | "tarea_id" | "alumno_id"> | null;
  if (!entrega) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [{ data: tareaRaw }, { data: profileRaw }] = await Promise.all([
    admin.from("tareas").select("id,titulo,curso_id,puntaje_maximo").eq("id", entrega.tarea_id).single(),
    admin.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
  ]);
  const tarea = tareaRaw as Pick<Tarea, "id" | "titulo" | "curso_id" | "puntaje_maximo"> | null;
  const profile = profileRaw as Pick<Profile, "rol"> | null;
  const { data: cursoRaw } = tarea
    ? await admin.from("cursos").select("profesor_id").eq("id", tarea.curso_id).single()
    : { data: null };
  const curso = cursoRaw as Pick<Curso, "profesor_id"> | null;
  if (!tarea || !curso || (curso.profesor_id !== user.id && profile?.rol !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: criteriaRaw } = await admin
    .from("tarea_rubricas")
    .select("id,puntaje_maximo")
    .eq("tarea_id", tarea.id)
    .order("orden");
  const criteria = (criteriaRaw as Pick<TareaRubrica, "id" | "puntaje_maximo">[] | null) ?? [];

  let score: number;
  if (criteria.length > 0) {
    if (!body.rubrica || body.rubrica.length !== criteria.length) {
      return NextResponse.json({ error: "incomplete_rubric" }, { status: 400 });
    }
    const byId = new Map(criteria.map((criterion) => [criterion.id, criterion]));
    const received = new Set<string>();
    for (const value of body.rubrica) {
      const criterion = value.rubricaId ? byId.get(value.rubricaId) : null;
      if (!criterion || received.has(criterion.id) || !Number.isFinite(value.puntaje) || value.puntaje! < 0 || value.puntaje! > criterion.puntaje_maximo || (value.comentario?.trim().length ?? 0) > 2000) {
        return NextResponse.json({ error: "invalid_rubric_score" }, { status: 400 });
      }
      received.add(criterion.id);
    }
    score = body.rubrica.reduce((total, value) => total + Math.round(value.puntaje!), 0);
  } else {
    if (!Number.isFinite(body.puntaje)) return NextResponse.json({ error: "invalid_score" }, { status: 400 });
    score = Math.round(body.puntaje!);
  }

  if (score < 0 || score > tarea.puntaje_maximo) {
    return NextResponse.json({ error: "score_exceeds_assignment" }, { status: 400 });
  }

  if (criteria.length > 0) {
    const { error: clearError } = await admin.from("entrega_rubrica_resultados").delete().eq("entrega_id", entrega.id);
    if (clearError) return NextResponse.json({ error: "save_failed" }, { status: 500 });
    const { error: rubricError } = await admin.from("entrega_rubrica_resultados").insert(
      body.rubrica!.map((value) => ({
        entrega_id: entrega.id,
        rubrica_id: value.rubricaId!,
        puntaje: Math.round(value.puntaje!),
        comentario: value.comentario?.trim() || null,
      })) as never,
    );
    if (rubricError) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const { error } = await admin
    .from("entregas_tarea")
    .update({
      puntaje: score,
      feedback_docente: feedback,
      estado: "revisada",
      revisado_at: new Date().toISOString(),
      revisado_por: user.id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", entrega.id);
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  await admin.from("notificaciones").insert({
    usuario_id: entrega.alumno_id,
    curso_id: tarea.curso_id,
    tipo: "entrega",
    titulo: `Tu entrega “${tarea.titulo}” fue revisada`,
    mensaje: `Obtuviste ${score}/${tarea.puntaje_maximo}. Revisa el feedback y la rúbrica.`,
    enlace: `/entregas/${tarea.id}`,
  } as never);

  return NextResponse.json({ ok: true, puntaje: score });
}
