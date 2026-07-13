import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { UsuariosManager } from "@/components/admin/UsuariosManager";
import type { UserRow, Inst } from "@/components/admin/UsuariosManager";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const user = await requireRole(["admin"], "/admin/usuarios");
  const supabase = await createClient();

  let users: UserRow[] = [];
  let instituciones: Inst[] = [];
  if (supabase) {
    const [uR, iR] = await Promise.all([
      supabase.from("profiles")
        .select("id, email, nombre, apellido, avatar_url, rol, institucion_id")
        .order("created_at", { ascending: true }),
      supabase.from("instituciones").select("id, nombre").order("nombre"),
    ]);
    users = (uR.data as UserRow[] | null) ?? [];
    instituciones = (iR.data as Inst[] | null) ?? [];
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p>
          <SectionTitle>Usuarios</SectionTitle>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Cambia roles y asigna instituciones. {users.length} cuentas registradas.
          </p>
        </div>
        <div className="animate-rise rise-2">
          <UsuariosManager users={users} instituciones={instituciones} currentUserId={user.id} />
        </div>
      </div>
    </AppShell>
  );
}
