/** Envía una notificación in-app a los alumnos activos de un curso. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Curso, EventoAcademico, Profile } from "@/lib/supabase/database.types";

const TIPOS = new Set(["evaluacion", "entrega", "sesion", "aviso"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { cursoId?: string; eventoId?: string; tipo?: string; titulo?: string; mensaje?: string; enlace?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const titulo = body.titulo?.trim();
  const mensaje = body.mensaje?.trim() || null;
  const enlace = body.enlace?.trim() || null;
  if (!body.cursoId || !titulo || !body.tipo || !TIPOS.has(body.tipo) || titulo.length > 160 || (mensaje?.length ?? 0) > 2000 || (enlace?.length ?? 0) > 500) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const [{ data: cursoRaw }, { data: profileRaw }] = await Promise.all([
    admin.from("cursos").select("id, profesor_id").eq("id", body.cursoId).maybeSingle(),
    admin.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
  ]);
  const curso = cursoRaw as Pick<Curso, "id" | "profesor_id"> | null;
  const profile = profileRaw as Pick<Profile, "rol"> | null;
  if (!curso || (curso.profesor_id !== user.id && profile?.rol !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (body.eventoId) {
    const { data: eventRaw } = await admin.from("eventos_academicos").select("curso_id").eq("id", body.eventoId).maybeSingle();
    const evento = eventRaw as Pick<EventoAcademico, "curso_id"> | null;
    if (!evento || evento.curso_id !== curso.id) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const { data: inscritosRaw } = await admin
    .from("inscripciones")
    .select("alumno_id")
    .eq("curso_id", curso.id)
    .in("estado", ["activa", "completada"]);
  const alumnoIds = [...new Set(((inscritosRaw as { alumno_id: string }[] | null) ?? []).map((item) => item.alumno_id))];
  if (!alumnoIds.length) return NextResponse.json({ enviados: 0 });

  const payload = alumnoIds.map((usuario_id) => ({
    usuario_id,
    curso_id: curso.id,
    evento_id: body.eventoId ?? null,
    tipo: body.tipo,
    titulo,
    mensaje,
    enlace,
  }));
  const { error } = await admin.from("notificaciones").upsert(payload as never, { onConflict: "evento_id,usuario_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "send_failed" }, { status: 500 });

  return NextResponse.json({ enviados: alumnoIds.length });
}
