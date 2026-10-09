/**
 * Contenido de un curso para Atlas CRM (asistente de la campaña).
 *
 * El asistente de Atlas responde solo con lo que está en el curso, así que lo
 * lee desde aquí: una sola fuente, y si el curso cambia en Aprende el
 * asistente lo ve en minutos. Solo Atlas puede pedirlo: firma
 * HMAC-SHA256("<timestamp>.<slug>") con el secreto compartido ATLAS_SSO_SECRET.
 * Devuelve las lecciones de lectura de un curso publicado; nunca quizzes ni
 * respuestas correctas.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createSbClient } from "@supabase/supabase-js";

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const VENTANA_SEGUNDOS = 300;

function firmaValida(secreto: string, timestamp: string, slug: string, firma: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > VENTANA_SEGUNDOS) return false;
  const esperada = createHmac("sha256", secreto).update(`${timestamp}.${slug}`).digest();
  const recibida = Buffer.from(firma, "base64url");
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

export async function GET(request: Request) {
  const secreto = process.env.ATLAS_SSO_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto || secreto.length < 32 || !url || !serviceKey) {
    return NextResponse.json({ error: "no_configurado" }, { status: 503 });
  }

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const timestamp = request.headers.get("x-atlas-timestamp") ?? "";
  const firma = request.headers.get("x-atlas-signature") ?? "";
  if (!SLUG.test(slug) || !firmaValida(secreto, timestamp, slug, firma)) {
    return NextResponse.json({ error: "no_autorizado" }, { status: 401 });
  }

  const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: curso } = await admin
    .from("cursos")
    .select("id, slug, titulo, updated_at")
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();
  if (!curso) return NextResponse.json({ error: "curso_no_encontrado" }, { status: 404 });

  const { data: lecciones, error } = await admin
    .from("lecciones")
    .select("id, titulo, contenido, orden")
    .eq("curso_id", curso.id)
    .eq("tipo", "texto")
    .order("orden");
  if (error) return NextResponse.json({ error: "lectura" }, { status: 500 });

  return NextResponse.json(
    {
      slug: curso.slug,
      titulo: curso.titulo,
      actualizado: curso.updated_at,
      lecciones: (lecciones ?? [])
        .filter((leccion) => leccion.contenido)
        .map((leccion) => ({ id: leccion.id, titulo: leccion.titulo, contenido: leccion.contenido })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
