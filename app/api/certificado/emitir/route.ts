/**
 * Emite (o recupera) el certificado de un curso para el alumno autenticado.
 * Verifica EN EL SERVIDOR que completó todas las lecciones antes de emitir.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Certificado, Leccion, ProgresoLeccion } from "@/lib/supabase/database.types";

function nuevoCodigo(): string {
  const s = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "");
  return `APR-${s.slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { cursoId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const cursoId = body.cursoId;
  if (!cursoId) return NextResponse.json({ error: "missing_curso" }, { status: 400 });

  // Ya emitido → devolver el existente
  const { data: existRaw } = await admin.from("certificados")
    .select("codigo").eq("alumno_id", user.id).eq("curso_id", cursoId).maybeSingle();
  const exist = existRaw as Pick<Certificado, "codigo"> | null;
  if (exist) return NextResponse.json({ codigo: exist.codigo });

  // Verificar completitud: todas las lecciones del curso completadas
  const { data: lecRaw } = await admin.from("lecciones").select("id").eq("curso_id", cursoId);
  const lecciones = (lecRaw as Pick<Leccion, "id">[] | null) ?? [];
  if (lecciones.length === 0) return NextResponse.json({ error: "curso_sin_lecciones" }, { status: 400 });

  const { data: progRaw } = await admin.from("progreso_lecciones")
    .select("leccion_id, completada").eq("alumno_id", user.id).eq("curso_id", cursoId);
  const prog = (progRaw as Pick<ProgresoLeccion, "leccion_id" | "completada">[] | null) ?? [];
  const completadas = new Set(prog.filter((p) => p.completada).map((p) => p.leccion_id));
  const todas = lecciones.every((l) => completadas.has(l.id));
  if (!todas) return NextResponse.json({ error: "curso_incompleto" }, { status: 403 });

  // Emitir
  const codigo = nuevoCodigo();
  const { error } = await admin.from("certificados")
    .insert({ codigo, alumno_id: user.id, curso_id: cursoId } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Marcar la inscripción como completada (best-effort)
  await admin.from("inscripciones").update({ estado: "completada" } as never)
    .eq("alumno_id", user.id).eq("curso_id", cursoId);

  return NextResponse.json({ codigo });
}
