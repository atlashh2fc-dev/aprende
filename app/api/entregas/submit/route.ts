import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EntregaTarea, Tarea } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const supabase = await createClient(); const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { tareaId?: string; texto?: string; enlace?: string; archivoPath?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const texto = body.texto?.trim() || null, enlace = body.enlace?.trim() || null, archivoPath = body.archivoPath?.trim() || null;
  if (!body.tareaId || (!texto && !enlace && !archivoPath) || (texto?.length ?? 0) > 12000 || (enlace?.length ?? 0) > 500 || (archivoPath && !archivoPath.startsWith(`${user.id}/`))) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const { data: tareaRaw } = await admin.from("tareas").select("id, curso_id, fecha_limite, permitir_reentrega, publicada").eq("id", body.tareaId).maybeSingle();
  const tarea = tareaRaw as Pick<Tarea, "id" | "curso_id" | "fecha_limite" | "permitir_reentrega" | "publicada"> | null;
  if (!tarea || !tarea.publicada) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: enrollment } = await supabase.from("inscripciones").select("id").eq("curso_id", tarea.curso_id).eq("alumno_id", user.id).in("estado", ["activa", "completada"]).maybeSingle();
  if (!enrollment) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
  const { data: currentRaw } = await admin.from("entregas_tarea").select("id").eq("tarea_id", tarea.id).eq("alumno_id", user.id).maybeSingle();
  const current = currentRaw as Pick<EntregaTarea, "id"> | null;
  if (current && !tarea.permitir_reentrega) return NextResponse.json({ error: "resubmission_disabled" }, { status: 403 });
  const now = new Date();
  const payload = { tarea_id: tarea.id, alumno_id: user.id, texto, enlace, archivo_path: archivoPath, estado: tarea.fecha_limite && new Date(tarea.fecha_limite) < now ? "atrasada" : "enviada", entregado_at: now.toISOString(), puntaje: null, feedback_docente: null, revisado_at: null, revisado_por: null, updated_at: now.toISOString() };
  const { error } = await admin.from("entregas_tarea").upsert(payload as never, { onConflict: "tarea_id,alumno_id" });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, estado: payload.estado });
}
