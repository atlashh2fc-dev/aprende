import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/database.types";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (currentUser.rol !== "admin") return NextResponse.json({ error: "No tienes permisos para eliminar cuentas." }, { status: 403 });

  const { id } = await params;
  if (id === currentUser.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El servicio de administración no está configurado." }, { status: 503 });

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id,rol")
    .eq("id", id)
    .maybeSingle();
  if (targetError) return NextResponse.json({ error: "No fue posible revisar la cuenta." }, { status: 500 });
  const targetProfile = target as Pick<Profile, "id" | "rol"> | null;
  if (!targetProfile) return NextResponse.json({ error: "La cuenta ya no existe." }, { status: 404 });

  if (targetProfile.rol === "admin") {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("rol", "admin");
    if (countError) return NextResponse.json({ error: "No fue posible verificar los administradores." }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "No puedes eliminar el último administrador de la plataforma." }, { status: 409 });
    }
  }

  // Elimina auth.users en el servidor (service_role); el FK borra el perfil y
  // los registros dependientes que sean seguros de eliminar.
  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json({
      error: "No se pudo eliminar esta cuenta porque tiene contenido asociado que debe reasignarse o conservarse.",
    }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
