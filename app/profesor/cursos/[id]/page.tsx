import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, ClipboardPenLine, ExternalLink, ListChecks, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CursoForm } from "@/components/admin/CursoForm";
import { LeccionesManager } from "@/components/admin/LeccionesManager";
import { ModulosManager } from "@/components/admin/ModulosManager";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Curso, Leccion, Modulo } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const BASE = "/profesor/cursos";

export default async function EditarCursoProfesorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["profesor", "admin"], `${BASE}/${id}`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: cursoRaw } = await supabase.from("cursos").select("*").eq("id", id).single();
  const curso = cursoRaw as Curso | null;
  if (!curso) notFound();
  // Solo el dueño (o un admin) puede editar.
  if (curso.profesor_id !== user.id && user.rol !== "admin") notFound();

  const { data: leccionesRaw } = await supabase
    .from("lecciones").select("*").eq("curso_id", id).order("orden", { ascending: true });
  const lecciones = (leccionesRaw as Leccion[] | null) ?? [];

  const { data: modulosRaw } = await supabase
    .from("modulos").select("*").eq("curso_id", id).order("orden", { ascending: true });
  const modulos = (modulosRaw as Modulo[] | null) ?? [];

  const leccionesPorModulo: Record<string, number> = {};
  lecciones.forEach((l) => { if (l.modulo_id) leccionesPorModulo[l.modulo_id] = (leccionesPorModulo[l.modulo_id] ?? 0) + 1; });

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href={BASE}
          className="mb-5 inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a mis cursos
        </Link>

        <div className="animate-rise mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow" style={{ color: "var(--primary)" }}>Editar curso</p>
            <h1 className="mt-1 font-serif-brand tracking-tight"
              style={{ fontSize: "clamp(1.7rem,4vw,2.2rem)", color: "var(--text)" }}>{curso.titulo}</h1>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Link href={`/profesor/cursos/${id}/entregas`}
              className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">
              <ClipboardPenLine className="h-3.5 w-3.5" /> Entregas
            </Link>
            <Link href={`/profesor/cursos/${id}/calificaciones`}
              className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">
              <ClipboardCheck className="h-3.5 w-3.5" /> Calificaciones
            </Link>
            {curso.estado === "publicado" && (
              <Link href={`/cursos/${curso.slug}`}
                className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> Ver público
              </Link>
            )}
          </div>
        </div>

        <div className="animate-rise rise-2">
          <CursoForm mode="edit" curso={curso} basePath={BASE} />
        </div>

        <div className="animate-rise rise-3 mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: "var(--primary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Módulos ({modulos.length})</h2>
          </div>
          <ModulosManager cursoId={curso.id} modulos={modulos} leccionesPorModulo={leccionesPorModulo} />
        </div>

        <div className="animate-rise rise-4 mt-10">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4" style={{ color: "var(--primary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Lecciones ({lecciones.length})</h2>
          </div>
          <LeccionesManager cursoId={curso.id} lecciones={lecciones} modulos={modulos} basePath={BASE} />
        </div>
      </div>
    </AppShell>
  );
}
