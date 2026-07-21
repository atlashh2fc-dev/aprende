import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { UsuariosManager } from "@/components/admin/UsuariosManager";
import type { AreaOption, UserRow, Inst } from "@/components/admin/UsuariosManager";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const user = await requireRole(["admin"], "/admin/usuarios");
  const supabase = await createClient();

  let users: UserRow[] = [];
  let instituciones: Inst[] = [];
  let areas: AreaOption[] = [];
  if (supabase) {
    const [uR, iR, aR, paR] = await Promise.all([
      supabase.from("profiles")
        .select("id, email, nombre, apellido, avatar_url, rol, institucion_id")
        .order("created_at", { ascending: true }),
      supabase.from("instituciones").select("id, nombre").order("nombre"),
      supabase.from("areas").select("id, nombre, institucion_id, tipo").order("nombre"),
      supabase.from("profile_areas").select("profile_id, area_id"),
    ]);
    const memberAreas = new Map<string, string[]>();
    ((paR.data as { profile_id: string; area_id: string }[] | null) ?? []).forEach(({ profile_id, area_id }) => memberAreas.set(profile_id, [...(memberAreas.get(profile_id) ?? []), area_id]));
    users = ((uR.data as Omit<UserRow, "area_ids">[] | null) ?? []).map((row) => ({ ...row, area_ids: memberAreas.get(row.id) ?? [] }));
    instituciones = (iR.data as Inst[] | null) ?? [];
    areas = (aR.data as AreaOption[] | null) ?? [];
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p>
            <SectionTitle>Usuarios</SectionTitle>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Cambia roles, empresa y áreas de capacitación. {users.length} cuentas registradas.
            </p>
          </div>
          <Link href="/admin/areas" className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs">
            <Building2 className="h-4 w-4" /> Gestionar áreas
          </Link>
        </div>
        <div className="animate-rise rise-2">
          <UsuariosManager users={users} instituciones={instituciones} areas={areas} currentUserId={user.id} />
        </div>
      </div>
    </AppShell>
  );
}
import Link from "next/link";
import { Building2 } from "lucide-react";
