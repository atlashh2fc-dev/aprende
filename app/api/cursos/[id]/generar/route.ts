import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCourseBlueprint, llamaParseConfigured, parseCourseMaterial } from "@/lib/course-builder";
import { aiConfigured } from "@/lib/ai";
import type { Curso, CursoMaterial, Profile } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_SOURCE_CHARS = 100_000;
const MAX_CHARS_PER_FILE = 28_000;
const STALE_GENERATION_MS = 6 * 60 * 1000;

type Progress = { progreso: number; etapa: string; mensaje?: string | null };

function describeError(error: unknown) {
  if (!(error instanceof Error)) return "generation_failed";
  return error.message.slice(0, 500);
}

function publicError(detail: string) {
  if (detail.startsWith("invalid_course_blueprint")) {
    return "La IA devolvió un quiz incompleto. No se modificó el curso; inténtalo nuevamente.";
  }
  if (detail.startsWith("option_insert_failed")) {
    return "No pudimos guardar una alternativa de un quiz generado. No se modificó el curso; inténtalo nuevamente.";
  }
  if (detail.startsWith("storage_download_failed")) {
    return "No pudimos abrir uno de los archivos privados. Vuelve a subirlo e inténtalo nuevamente.";
  }
  return "No fue posible construir el curso. No se modificó el contenido existente.";
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id: cursoId } = await context.params;
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!llamaParseConfigured() || !aiConfigured()) {
    return NextResponse.json({
      error: "provider_not_configured",
      message: "Faltan LLAMA_CLOUD_API_KEY o INCEPTION_API_KEY en las variables de entorno.",
    }, { status: 503 });
  }

  const [{ data: cursoRaw }, { data: profileRaw }] = await Promise.all([
    admin.from("cursos").select("id,titulo,profesor_id,descripcion,descripcion_corta,nivel,duracion_horas").eq("id", cursoId).maybeSingle(),
    admin.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
  ]);
  const curso = cursoRaw as Pick<Curso, "id" | "titulo" | "profesor_id" | "descripcion" | "descripcion_corta" | "nivel" | "duracion_horas"> | null;
  const profile = profileRaw as Pick<Profile, "rol"> | null;
  if (!curso || (curso.profesor_id !== user.id && profile?.rol !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Una función de Vercel puede terminar abruptamente al alcanzar su límite.
  // Cerramos esas ejecuciones antes de permitir un nuevo intento, para que no
  // queden visibles como activas para siempre ni bloqueen al profesor.
  const staleBefore = new Date(Date.now() - STALE_GENERATION_MS).toISOString();
  await admin.from("curso_generaciones").update({
    estado: "error",
    progreso: 100,
    etapa: "Tiempo de espera agotado",
    mensaje_progreso: "La generación tardó demasiado. Puedes volver a intentarlo.",
    detalle_error: "generation_timeout",
    completed_at: new Date().toISOString(),
  } as never).eq("curso_id", cursoId).eq("estado", "procesando").lt("created_at", staleBefore);

  const { data: activeGenerationRaw } = await admin
    .from("curso_generaciones")
    .select("id")
    .eq("curso_id", cursoId)
    .eq("estado", "procesando")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeGenerationRaw) {
    return NextResponse.json({
      error: "generation_in_progress",
      message: "Este curso ya se está construyendo. Espera a que termine antes de iniciar otro intento.",
    }, { status: 409 });
  }

  const [{ count: existingLessons }, { count: existingModules }] = await Promise.all([
    admin.from("lecciones").select("id", { count: "exact", head: true }).eq("curso_id", cursoId),
    admin.from("modulos").select("id", { count: "exact", head: true }).eq("curso_id", cursoId),
  ]);
  if ((existingLessons ?? 0) > 0 || (existingModules ?? 0) > 0) {
    return NextResponse.json({
      error: "course_has_content",
      message: "Este curso ya tiene módulos o lecciones. Para proteger el trabajo existente, crea un curso nuevo o elimina primero el contenido actual.",
    }, { status: 409 });
  }

  const { data: materialsRaw } = await admin
    .from("curso_materiales")
    .select("*")
    .eq("curso_id", cursoId)
    .order("created_at", { ascending: true });
  const materials = (materialsRaw as CursoMaterial[] | null) ?? [];
  if (!materials.length) return NextResponse.json({ error: "no_materials" }, { status: 400 });

  const { data: generationRaw, error: generationError } = await admin
    .from("curso_generaciones")
    .insert({
      curso_id: cursoId, creado_por: user.id, estado: "procesando", progreso: 3,
      etapa: "Preparando curso", mensaje_progreso: "Validando el curso y el material fuente.",
    } as never)
    .select("id")
    .single();
  if (generationError || !generationRaw) return NextResponse.json({ error: "generation_start_failed" }, { status: 500 });
  const generationId = (generationRaw as { id: string }).id;
  async function reportProgress({ progreso, etapa, mensaje = null }: Progress) {
    const { error } = await admin!.from("curso_generaciones").update({
      progreso, etapa, mensaje_progreso: mensaje,
    } as never).eq("id", generationId);
    if (error) throw new Error(`progress_update_failed:${error.code ?? "unknown"}`);
  }

  let activeMaterialId: string | null = null;
  // Supabase REST no permite envolver estas inserciones relacionadas en una única
  // transacción. Conservamos únicamente los IDs creados por esta petición para
  // poder compensar un fallo sin borrar contenido que ya existía en el curso.
  const createdLessonIds: string[] = [];
  const createdModuleIds: string[] = [];
  try {
    const sourceParts: string[] = [];
    for (const [materialIndex, material] of materials.entries()) {
      await reportProgress({
        progreso: 8 + Math.round((materialIndex / materials.length) * 34),
        etapa: "Leyendo documentos",
        mensaje: `Analizando ${materialIndex + 1} de ${materials.length}: ${material.nombre_archivo}`,
      });
      let text = material.texto_extraido;
      if (!text) {
        activeMaterialId = material.id;
        await admin.from("curso_materiales").update({ estado: "procesando", detalle_error: null } as never).eq("id", material.id);
        const { data: file, error: downloadError } = await admin.storage.from("materiales-curso").download(material.storage_path);
        if (downloadError || !file) throw new Error(`storage_download_failed:${material.nombre_archivo}`);
        const parsed = await parseCourseMaterial({ file, filename: material.nombre_archivo, mimeType: material.mime_type });
        text = parsed.markdown;
        const { error: materialUpdateError } = await admin.from("curso_materiales").update({
          estado: "listo", texto_extraido: text, llama_job_id: parsed.jobId, detalle_error: null, updated_at: new Date().toISOString(),
        } as never).eq("id", material.id);
        if (materialUpdateError) throw new Error("material_save_failed");
        activeMaterialId = null;
      }
      sourceParts.push(`## Archivo: ${material.nombre_archivo}\n${text.slice(0, MAX_CHARS_PER_FILE)}`);
    }

    const source = sourceParts.join("\n\n").slice(0, MAX_SOURCE_CHARS);
    if (!source.trim()) throw new Error("empty_source_material");
    await reportProgress({ progreso: 46, etapa: "Diseñando el curso", mensaje: "Organizando módulos, lecciones y evaluaciones." });
    const blueprint = await createCourseBlueprint(curso.titulo, source);
    const totalLessons = blueprint.modulos.reduce((sum, moduleDefinition) => sum + moduleDefinition.lecciones.length, 0);

    let lessonOrder = 0;
    for (const [moduleIndex, moduleDefinition] of blueprint.modulos.entries()) {
      const { data: moduleRaw, error: moduleError } = await admin.from("modulos")
        .insert({ curso_id: cursoId, titulo: moduleDefinition.titulo.trim(), orden: moduleIndex } as never).select("id").single();
      if (moduleError || !moduleRaw) throw new Error("module_insert_failed");
      const moduleId = (moduleRaw as { id: string }).id;
      createdModuleIds.push(moduleId);

      for (const lesson of moduleDefinition.lecciones) {
        await reportProgress({
          progreso: Math.min(94, 56 + Math.round((lessonOrder / Math.max(totalLessons, 1)) * 38)),
          etapa: "Creando contenido",
          mensaje: `Construyendo lección ${lessonOrder + 1} de ${totalLessons}: ${lesson.titulo}`,
        });
        const { data: lessonRaw, error: lessonError } = await admin.from("lecciones").insert({
          curso_id: cursoId, modulo_id: moduleId, titulo: lesson.titulo.trim(), tipo: lesson.tipo,
          contenido: lesson.tipo === "texto" ? lesson.contenido.trim() : null,
          duracion_min: Math.max(1, Math.round(lesson.duracionMin || 5)), orden: lessonOrder++,
        } as never).select("id").single();
        if (lessonError || !lessonRaw) throw new Error("lesson_insert_failed");
        createdLessonIds.push((lessonRaw as { id: string }).id);

        if (lesson.tipo === "quiz") {
          const lessonId = (lessonRaw as { id: string }).id;
          const { data: quizRaw, error: quizError } = await admin.from("quizzes").insert({
            curso_id: cursoId, leccion_id: lessonId, titulo: lesson.quiz.titulo.trim(),
            aprobacion_min: Math.min(100, Math.max(0, Math.round(lesson.quiz.aprobacionMin || 60))),
          } as never).select("id").single();
          if (quizError || !quizRaw) throw new Error("quiz_insert_failed");
          const quizId = (quizRaw as { id: string }).id;

          for (const [questionIndex, question] of lesson.quiz.preguntas.entries()) {
            const { data: questionRaw, error: questionError } = await admin.from("quiz_preguntas").insert({
              quiz_id: quizId, enunciado: question.enunciado.trim(), tipo: question.tipo, orden: questionIndex,
            } as never).select("id").single();
            if (questionError || !questionRaw) throw new Error("question_insert_failed");
            const questionId = (questionRaw as { id: string }).id;
            const options = question.opciones.map((option, optionIndex) => ({
              pregunta_id: questionId, texto: option.texto.trim(), es_correcta: option.esCorrecta, orden: optionIndex,
            }));
            const { error: optionError } = await admin.from("quiz_opciones").insert(options as never);
            if (optionError) throw new Error(`option_insert_failed:${optionError.code ?? "unknown"}:${optionError.message}`);
          }
        }
      }
    }

    const courseUpdate: Record<string, unknown> = {};
    if (!curso.descripcion_corta?.trim()) courseUpdate.descripcion_corta = blueprint.descripcionCorta;
    if (!curso.descripcion?.trim()) courseUpdate.descripcion = blueprint.descripcion;
    if (!curso.nivel?.trim()) courseUpdate.nivel = blueprint.nivel;
    if (!curso.duracion_horas || Number(curso.duracion_horas) <= 0) courseUpdate.duracion_horas = blueprint.duracionHoras;
    if (Object.keys(courseUpdate).length) await admin.from("cursos").update(courseUpdate as never).eq("id", cursoId);

    await admin.from("curso_generaciones").update({
      estado: "completado", progreso: 100, etapa: "Curso listo", mensaje_progreso: "El curso fue construido y está listo para revisar.",
      materiales_procesados: materials.length, completed_at: new Date().toISOString(),
    } as never).eq("id", generationId);
    return NextResponse.json({ ok: true, modules: blueprint.modulos.length, lessons: lessonOrder });
  } catch (error) {
    const detail = describeError(error);
    // Eliminar las lecciones primero evita que al borrar módulos la FK deje
    // lecciones huérfanas (modulo_id usa ON DELETE SET NULL). Los quizzes y sus
    // preguntas/opciones se eliminan mediante las cascadas de lecciones.
    if (createdLessonIds.length) {
      await admin.from("lecciones").delete().in("id", createdLessonIds);
    }
    if (createdModuleIds.length) {
      await admin.from("modulos").delete().in("id", createdModuleIds);
    }
    if (activeMaterialId) {
      await admin.from("curso_materiales").update({ estado: "error", detalle_error: detail.slice(0, 500) } as never).eq("id", activeMaterialId);
    }
    await admin.from("curso_generaciones").update({
      estado: "error", progreso: 100, etapa: "No se pudo completar", mensaje_progreso: publicError(detail),
      detalle_error: detail, completed_at: new Date().toISOString(),
    } as never).eq("id", generationId);
    return NextResponse.json({ error: "generation_failed", message: publicError(detail) }, { status: 502 });
  }
}
