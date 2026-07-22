import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AgendaBoard } from "@/components/AgendaBoard";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EventoAcademicoTipo } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  curso_id: string;
  titulo: string;
  tipo: EventoAcademicoTipo;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  cursos: { titulo: string } | null;
};

export default async function AgendaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/agenda");
  const supabase = await createClient();
  const canManage = user.rol === "profesor" || user.rol === "admin";

  let events: EventRow[] = [];
  let courses: { id: string; titulo: string }[] = [];
  if (supabase) {
    const { data: eventRows } = await supabase
      .from("eventos_academicos")
      .select("id, curso_id, titulo, tipo, descripcion, fecha_inicio, fecha_fin, cursos(titulo)")
      .order("fecha_inicio", { ascending: true });
    events = (eventRows as unknown as EventRow[] | null) ?? [];
    if (canManage) {
      const { data: courseRows } = await supabase.from("cursos").select("id, titulo").order("titulo");
      courses = (courseRows as { id: string; titulo: string }[] | null) ?? [];
    }
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="animate-rise mb-8">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Planificación académica</p>
          <h1 className="mt-2 font-serif-brand text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text)" }}>Agenda</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {canManage ? "Publica evaluaciones, sesiones, entregas y avisos para mantener al curso alineado." : "Aquí aparecen los hitos de los cursos en los que estás inscrito."}
          </p>
        </div>
        <AgendaBoard
          events={events.map((event) => ({ ...event, curso_titulo: event.cursos?.titulo ?? "Curso" }))}
          courses={courses}
          canManage={canManage}
        />
      </div>
    </AppShell>
  );
}
