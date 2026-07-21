import { AppShell } from "@/components/AppShell";
import { AreasManager, type AreaRow, type CourseOption, type InstOption } from "@/components/admin/AreasManager";
import { SectionTitle } from "@/components/ui/StatCard";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAreasPage() {
  const user = await requireRole(["admin"], "/admin/areas");
  const supabase = await createClient();
  let areas: AreaRow[] = [];
  let instituciones: InstOption[] = [];
  let cursos: CourseOption[] = [];
  if (supabase) {
    const [areasR, instR, coursesR, membershipsR, assignmentsR] = await Promise.all([
      supabase.from("areas").select("id, institucion_id, nombre, slug, tipo").order("nombre"),
      supabase.from("instituciones").select("id, nombre").order("nombre"),
      supabase.from("cursos").select("id, titulo, institucion_id").order("titulo"),
      supabase.from("profile_areas").select("area_id"),
      supabase.from("curso_areas").select("area_id, curso_id"),
    ]);
    instituciones = (instR.data as InstOption[] | null) ?? [];
    cursos = (coursesR.data as CourseOption[] | null) ?? [];
    const memberCounts = new Map<string, number>();
    ((membershipsR.data as { area_id: string }[] | null) ?? []).forEach(({ area_id }) => memberCounts.set(area_id, (memberCounts.get(area_id) ?? 0) + 1));
    const assignedCourses = new Map<string, string[]>();
    ((assignmentsR.data as { area_id: string; curso_id: string }[] | null) ?? []).forEach(({ area_id, curso_id }) => assignedCourses.set(area_id, [...(assignedCourses.get(area_id) ?? []), curso_id]));
    areas = ((areasR.data as Omit<AreaRow, "miembros" | "curso_ids">[] | null) ?? []).map((area) => ({ ...area, miembros: memberCounts.get(area.id) ?? 0, curso_ids: assignedCourses.get(area.id) ?? [] }));
  }
  return <AppShell user={user}><div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12"><div className="animate-rise mb-8"><p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p><SectionTitle>Áreas y unidades</SectionTitle><p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Segmenta capacitaciones por área, unidad de negocio o campaña.</p></div><div className="animate-rise rise-2"><AreasManager areas={areas} instituciones={instituciones} cursos={cursos} /></div></div></AppShell>;
}
