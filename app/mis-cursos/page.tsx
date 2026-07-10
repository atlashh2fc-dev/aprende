import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/ui/StatCard";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MisCursosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/mis-cursos");
  const supabase = await createClient();

  let cursos: { slug: string; titulo: string; imagen_url: string | null; estado: string }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("inscripciones")
      .select("estado, cursos(slug, titulo, imagen_url)")
      .eq("alumno_id", user.id)
      .order("fecha_inscripcion", { ascending: false });
    const rows = (data as unknown as { estado: string; cursos: { slug: string; titulo: string; imagen_url: string | null } | null }[] | null) ?? [];
    cursos = rows.filter((r) => r.cursos).map((r) => ({ ...r.cursos!, estado: r.estado }));
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mb-8">
          <p className="eyebrow" style={{ color: "var(--text-faint)" }}>Tu aprendizaje</p>
          <SectionTitle>Mis cursos</SectionTitle>
        </div>
        {cursos.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aún no estás inscrito en ningún curso.</p>
            <Link href="/explorar" className="btn-primary mt-5 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-xs">
              Explorar cursos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => (
              <Link key={c.slug} href={`/cursos/${c.slug}`} className="card-glass overflow-hidden">
                <div className="aspect-[16/9]" style={{ background: c.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), color-mix(in srgb, var(--accent) 18%, transparent))" }}>
                  {c.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagen_url} alt={c.titulo} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <h4 className="line-clamp-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</h4>
                  <span className="badge shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold capitalize">{c.estado}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
