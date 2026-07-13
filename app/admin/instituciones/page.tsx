import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { InstitucionesManager } from "@/components/admin/InstitucionesManager";
import type { InstRow } from "@/components/admin/InstitucionesManager";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminInstitucionesPage() {
  const user = await requireRole(["admin"], "/admin/instituciones");
  const supabase = await createClient();

  let instituciones: InstRow[] = [];
  if (supabase) {
    const [instR, profR, cursosR] = await Promise.all([
      supabase.from("instituciones").select("id, nombre, slug").order("nombre"),
      supabase.from("profiles").select("institucion_id, rol"),
      supabase.from("cursos").select("institucion_id"),
    ]);
    const base = (instR.data as { id: string; nombre: string; slug: string }[] | null) ?? [];
    const profs = (profR.data as { institucion_id: string | null; rol: string }[] | null) ?? [];
    const cursos = (cursosR.data as { institucion_id: string | null }[] | null) ?? [];

    instituciones = base.map((i) => ({
      ...i,
      alumnos: profs.filter((p) => p.institucion_id === i.id && p.rol === "alumno").length,
      supervisores: profs.filter((p) => p.institucion_id === i.id && p.rol === "supervisor").length,
      cursos: cursos.filter((c) => c.institucion_id === i.id).length,
    }));
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p>
          <SectionTitle>Instituciones</SectionTitle>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Crea y gestiona cohortes. {instituciones.length} instituciones.
          </p>
        </div>
        <div className="animate-rise rise-2">
          <InstitucionesManager instituciones={instituciones} />
        </div>
      </div>
    </AppShell>
  );
}
