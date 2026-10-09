/**
 * Entrada desde Atlas CRM con la misma cuenta.
 *
 * Atlas y Aprende tienen cada uno su Supabase, así que no comparten sesión.
 * Atlas firma un pase corto (HMAC-SHA256 con el secreto compartido
 * ATLAS_SSO_SECRET) y el navegador lo trae por POST. Aquí:
 *   1. se valida firma, audiencia, vigencia y origen;
 *   2. se marca el pase como usado (un solo uso);
 *   3. se busca o crea a la persona por su correo, en la institución de su
 *      empresa (mismo slug que en Atlas);
 *   4. se abre su sesión con un enlace mágico generado y verificado en el
 *      servidor (nunca sale del servidor);
 *   5. si el pase trae curso, queda inscrita y entra directo a él.
 *
 * Una cuenta que ya existía (por ejemplo, entró antes con Google con el mismo
 * correo) es la misma persona: se reutiliza y no se le cambia el rol.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type Pase = {
  v: number;
  iss: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  sub: string;
  email: string;
  nombre: string;
  org: string;
  rol: string;
  curso: string | null;
};

const ORIGENES = (process.env.ATLAS_SSO_ORIGINS || "https://atlascrm.geimser.cl")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function verificar(token: string, secreto: string): Pase | null {
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", secreto).update(cuerpo).digest();
  const recibida = Buffer.from(firma, "base64url");
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const pase = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) as Pase;
    const ahora = Math.floor(Date.now() / 1000);
    if (pase.v !== 1 || pase.iss !== "atlas-crm" || pase.aud !== "aprende") return null;
    if (typeof pase.exp !== "number" || pase.exp < ahora || pase.exp - pase.iat > 300) return null;
    if (typeof pase.jti !== "string" || pase.jti.length < 16) return null;
    if (typeof pase.email !== "string" || !EMAIL.test(pase.email)) return null;
    if (typeof pase.org !== "string" || !SLUG.test(pase.org)) return null;
    if (pase.curso !== null && (typeof pase.curso !== "string" || !SLUG.test(pase.curso))) return null;
    return pase;
  } catch {
    return null;
  }
}

function aLogin(origin: string, motivo: string) {
  return NextResponse.redirect(`${origin}/login?error=${motivo}`, 303);
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const secreto = process.env.ATLAS_SSO_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto || secreto.length < 32 || !url || !serviceKey) return aLogin(origin, "atlas_no_configurado");

  // El formulario lo envía el navegador desde Atlas; otro origen no corresponde.
  const desde = request.headers.get("origin");
  if (desde && !ORIGENES.includes(desde)) return aLogin(origin, "atlas_origen");

  const form = await request.formData().catch(() => null);
  const token = form?.get("pase");
  const pase = typeof token === "string" ? verificar(token, secreto) : null;
  if (!pase) return aLogin(origin, "atlas_pase");

  const email = pase.email.trim().toLowerCase();
  const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Un solo uso: el segundo intento con el mismo pase choca con la llave primaria.
  const { error: usadoError } = await admin.from("sso_pases_usados").insert({ jti: pase.jti, email });
  if (usadoError) return aLogin(origin, "atlas_pase_usado");

  const { data: institucion } = await admin.from("instituciones").select("id").eq("slug", pase.org).maybeSingle();
  if (!institucion) return aLogin(origin, "atlas_sin_institucion");

  // Crea la cuenta si no existe; si ya existe (Google u otro ingreso), se reutiliza.
  const { data: creado, error: crearError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: pase.nombre, origen: "atlas-crm", atlas_profile_id: pase.sub },
  });
  const esNueva = Boolean(creado?.user) && !crearError;
  if (crearError && !/already|registered|exists/i.test(crearError.message)) {
    console.error("[sso-atlas] no se pudo crear la cuenta", crearError.message);
    return aLogin(origin, "atlas_cuenta");
  }

  // Sesión: enlace mágico generado y verificado aquí mismo, con las cookies del navegador.
  const { data: enlace, error: enlaceError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = enlace?.properties?.hashed_token;
  if (enlaceError || !tokenHash) {
    console.error("[sso-atlas] no se pudo generar el acceso", enlaceError?.message);
    return aLogin(origin, "atlas_sesion");
  }
  const supabase = await createClient();
  if (!supabase) return aLogin(origin, "atlas_no_configurado");
  const { data: sesion, error: sesionError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  const userId = sesion?.user?.id;
  if (sesionError || !userId) {
    console.error("[sso-atlas] no se pudo abrir la sesión", sesionError?.message);
    return aLogin(origin, "atlas_sesion");
  }

  // Perfil: institución y nombre si faltan. El rol solo se fija al crear la
  // cuenta (supervisión de Atlas = supervisor aquí); nunca se sube después.
  const { data: perfil } = await admin.from("profiles").select("nombre, institucion_id").eq("id", userId).maybeSingle();
  const cambios: Record<string, unknown> = {};
  if (!perfil?.institucion_id) cambios.institucion_id = institucion.id;
  if (!perfil?.nombre && pase.nombre) {
    const [nombre, ...resto] = pase.nombre.trim().split(/\s+/);
    cambios.nombre = nombre;
    if (resto.length) cambios.apellido = resto.join(" ");
  }
  if (esNueva) cambios.rol = pase.rol === "supervisor" || pase.rol === "admin" ? "supervisor" : "alumno";
  if (Object.keys(cambios).length) await admin.from("profiles").update(cambios).eq("id", userId);

  let destino = "/mis-cursos";
  if (pase.curso) {
    const { data: curso } = await admin
      .from("cursos")
      .select("id, slug, institucion_id")
      .eq("slug", pase.curso)
      .eq("estado", "publicado")
      .maybeSingle();
    if (curso && (curso.institucion_id === null || curso.institucion_id === institucion.id)) {
      await admin
        .from("inscripciones")
        .upsert({ alumno_id: userId, curso_id: curso.id, estado: "activa" }, { onConflict: "alumno_id,curso_id", ignoreDuplicates: true });
      destino = `/cursos/${curso.slug}`;
    }
  }

  return NextResponse.redirect(`${origin}${destino}`, 303);
}
