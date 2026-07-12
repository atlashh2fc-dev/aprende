import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { CursoForm } from "@/components/admin/CursoForm";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NuevoCursoPage() {
  const user = await requireRole(["admin"], "/admin/cursos/nuevo");
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/admin/cursos"
          className="mb-5 inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a cursos
        </Link>
        <div className="animate-rise mb-6">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Administración</p>
          <SectionTitle>Nuevo curso</SectionTitle>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Crea el curso en borrador; luego podrás agregar lecciones y publicarlo.
          </p>
        </div>
        <div className="animate-rise rise-2">
          <CursoForm mode="create" />
        </div>
      </div>
    </AppShell>
  );
}
