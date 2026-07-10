import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Trophy, Clock, Users, GraduationCap, Inbox, ArrowRight, Compass, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard, SectionTitle } from "@/components/ui/StatCard";
import { getSessionUser, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/roles";
import type { Curso, Inscripcion } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard");
  const supabase = await createClient();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        {/* Bienvenida */}
        <div className="mb-8">
          <p className="eyebrow" style={{ color: "var(--text-faint)" }}>{ROLE_LABEL[user.rol]}</p>
          <h1 className="mt-1 font-serif-brand" style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 700, color: "var(--text)" }}>
            Hola, {displayName(user)}.
          </h1>
        </div>

        {user.rol === "alumno" && <AlumnoView userId={user.id} />}
        {user.rol === "profesor" && <ProfesorView userId={user.id} />}
        {user.rol === "supervisor" && <SupervisorView institucionId={user.institucion_id} />}
        {user.rol === "admin" && <AdminView />}
        {!supabase && (
          <p className="card mt-6 p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Conecta Supabase (variables en <code>.env.local</code>) para ver datos reales.
          </p>
        )}
      </div>
    </AppShell>
  );
}

/* ── ALUMNO ─────────────────────────────────────────────── */
async function AlumnoView({ userId }: { userId: string }) {
  const supabase = await createClient();
  let inscritos = 0, completados = 0;
  let cursos: { slug: string; titulo: string; imagen_url: string | null }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("inscripciones")
      .select("estado, cursos(slug, titulo, imagen_url)")
      .eq("alumno_id", userId)
      .order("fecha_inscripcion", { ascending: false });
    const rows = (data as unknown as { estado: string; cursos: { slug: string; titulo: string; imagen_url: string | null } | null }[] | null) ?? [];
    inscritos = rows.filter((r) => r.estado === "activa").length;
    completados = rows.filter((r) => r.estado === "completada").length;
    cursos = rows.map((r) => r.cursos).filter(Boolean) as typeof cursos;
  }

  if (inscritos === 0 && completados === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div className="card relative overflow-hidden p-8 sm:p-11">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)" }} />
          <div className="relative max-w-lg">
            <span className="eyebrow inline-flex items-center gap-2" style={{ color: "var(--primary-light)" }}>
              <Compass className="h-4 w-4" /> Comienza aquí
            </span>
            <h2 className="mt-3 font-serif-brand" style={{ fontSize: "clamp(1.7rem,4vw,2.6rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.05 }}>
              Explora tu primer <span className="text-gradient italic">curso</span>.
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Aún no estás inscrito en ningún curso. Descubre el catálogo y empieza a aprender.
            </p>
            <Link href="/explorar" className="btn-primary mt-7 inline-flex items-center gap-2.5 rounded-lg px-7 py-3.5 text-xs">
              Explorar cursos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Cursos activos" value={inscritos} color="var(--accent)" />
        <StatCard icon={Trophy} label="Completados" value={completados} color="var(--primary)" />
        <StatCard icon={Clock} label="En progreso" value={cursos.length} color="#4ade80" />
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Continuar aprendiendo</SectionTitle>
          <Link href="/mis-cursos" className="btn-ghost rounded-lg px-3.5 py-2 text-xs">Ver todos</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.slice(0, 6).map((c) => (
            <Link key={c.slug} href={`/cursos/${c.slug}`} className="card-glass overflow-hidden">
              <div className="aspect-[16/9] w-full" style={{ background: c.imagen_url ? undefined : "linear-gradient(135deg, var(--primary-dim), color-mix(in srgb, var(--accent) 18%, transparent))" }}>
                {c.imagen_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imagen_url} alt={c.titulo} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <h4 className="line-clamp-2 text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</h4>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── PROFESOR ───────────────────────────────────────────── */
async function ProfesorView({ userId }: { userId: string }) {
  const supabase = await createClient();
  let cursos: Pick<Curso, "id" | "slug" | "titulo" | "estado">[] = [];
  let inscritos = 0;
  if (supabase) {
    const { data } = await supabase.from("cursos").select("id, slug, titulo, estado").eq("profesor_id", userId);
    cursos = (data as typeof cursos | null) ?? [];
    if (cursos.length) {
      const { count } = await supabase.from("inscripciones").select("*", { count: "exact", head: true })
        .in("curso_id", cursos.map((c) => c.id)).eq("estado", "activa");
      inscritos = count ?? 0;
    }
  }
  const publicados = cursos.filter((c) => c.estado === "publicado").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Mis cursos" value={cursos.length} color="var(--accent)" />
        <StatCard icon={Users} label="Alumnos inscritos" value={inscritos} color="var(--primary)" />
        <StatCard icon={GraduationCap} label="Publicados" value={publicados} color="#4ade80" />
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Mis cursos</SectionTitle>
          <Link href="/profesor/cursos" className="btn-ghost rounded-lg px-3.5 py-2 text-xs">Gestionar</Link>
        </div>
        {cursos.length === 0 ? (
          <p className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Aún no tienes cursos. Crea el primero desde <Link href="/profesor/cursos" style={{ color: "var(--primary-light)" }}>gestión de cursos</Link>.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {cursos.map((c) => (
              <div key={c.id} className="card flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</span>
                <span className="badge rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold capitalize">{c.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SUPERVISOR ─────────────────────────────────────────── */
async function SupervisorView({ institucionId }: { institucionId: string | null }) {
  const supabase = await createClient();
  let cursos = 0, alumnos = 0, institucion = "tu institución";
  if (supabase && institucionId) {
    const [{ count: c }, { count: a }, inst] = await Promise.all([
      supabase.from("cursos").select("*", { count: "exact", head: true }).eq("institucion_id", institucionId),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("institucion_id", institucionId).eq("rol", "alumno"),
      supabase.from("instituciones").select("nombre").eq("id", institucionId).single(),
    ]);
    cursos = c ?? 0; alumnos = a ?? 0;
    institucion = (inst.data as { nombre: string } | null)?.nombre ?? institucion;
  }

  return (
    <div className="flex flex-col gap-6">
      {!institucionId && (
        <p className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Tu cuenta de supervisor aún no está asignada a una institución. Un administrador debe asignártela.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Layers} label="Cursos de la institución" value={cursos} color="var(--accent)" />
        <StatCard icon={Users} label="Alumnos" value={alumnos} color="var(--primary)" />
        <StatCard icon={GraduationCap} label="Institución" value={institucion} color="#4ade80" />
      </div>
      <div>
        <SectionTitle>Supervisión</SectionTitle>
        <p className="mt-3 card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Vista de solo lectura del avance de <strong style={{ color: "var(--text)" }}>{institucion}</strong>.
          El detalle por alumno y curso se gestiona en <Link href="/supervisor" style={{ color: "var(--primary-light)" }}>Mi institución</Link>.
        </p>
      </div>
    </div>
  );
}

/* ── ADMIN ──────────────────────────────────────────────── */
async function AdminView() {
  const supabase = await createClient();
  let cursos = 0, alumnos = 0, profesores = 0;
  if (supabase) {
    const [{ count: c }, { count: a }, { count: p }] = await Promise.all([
      supabase.from("cursos").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("rol", "alumno"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("rol", "profesor"),
    ]);
    cursos = c ?? 0; alumnos = a ?? 0; profesores = p ?? 0;
  }

  const links = [
    { href: "/admin/cursos", icon: BookOpen, title: "Cursos", desc: "Crear, publicar y archivar cursos" },
    { href: "/admin/usuarios", icon: Users, title: "Usuarios", desc: "Roles, instituciones y accesos" },
    { href: "/admin/instituciones", icon: Inbox, title: "Instituciones", desc: "Cohortes y supervisores" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Cursos" value={cursos} color="var(--accent)" />
        <StatCard icon={Users} label="Alumnos" value={alumnos} color="var(--primary)" />
        <StatCard icon={GraduationCap} label="Profesores" value={profesores} color="#4ade80" />
      </div>
      <div>
        <SectionTitle>Gestión</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="card-glass p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "var(--primary-dim)", color: "var(--primary-light)" }}>
                <l.icon className="h-5 w-5" />
              </span>
              <h4 className="mt-4 text-sm font-semibold" style={{ color: "var(--text)" }}>{l.title}</h4>
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
