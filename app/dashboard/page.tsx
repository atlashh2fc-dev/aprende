import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Trophy, Clock, Users, GraduationCap, Inbox, ArrowRight, Compass, Layers, TrendingUp, CheckCircle2, Building2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard, SectionTitle } from "@/components/ui/StatCard";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { ChartCard, CursosBar, ActividadArea } from "@/components/Charts";
import { LearnerReport, type LearnerReportRow } from "@/components/LearnerReport";
import { getSessionUser, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/roles";
import { readDemoRole, effectiveRole } from "@/lib/demo";
import type { Curso } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard");
  const supabase = await createClient();
  const demo = await readDemoRole();
  const role = effectiveRole(user.rol, demo);
  const enModoDemo = user.rol === "admin" && !!demo && demo !== "admin";

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        {/* Bienvenida */}
        <div className="animate-rise mb-8">
          <p className="eyebrow flex items-center gap-2" style={{ color: "var(--primary)" }}>
            {ROLE_LABEL[role]}
            {enModoDemo && (
              <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase not-italic"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>Modo demo</span>
            )}
          </p>
          <h1 className="mt-1 font-serif-brand tracking-tight"
            style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 700, color: "var(--text)" }}>
            Hola, {displayName(user)}.
          </h1>
        </div>

        {role === "alumno" && <AlumnoView userId={user.id} />}
        {role === "profesor" && <ProfesorView userId={user.id} />}
        {role === "supervisor" && <SupervisorView institucionId={user.institucion_id} />}
        {role === "admin" && <AdminView />}
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
  let cursos: { id: string; slug: string; titulo: string; imagen_url: string | null; avance: number; nextHref: string }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("inscripciones")
      .select("estado, cursos(id, slug, titulo, imagen_url)")
      .eq("alumno_id", userId)
      .order("fecha_inscripcion", { ascending: false });
    const rows = (data as unknown as { estado: string; cursos: { id: string; slug: string; titulo: string; imagen_url: string | null } | null }[] | null) ?? [];
    inscritos = rows.filter((r) => r.estado === "activa").length;
    completados = rows.filter((r) => r.estado === "completada").length;
    const base = rows.map((r) => r.cursos).filter(Boolean) as { id: string; slug: string; titulo: string; imagen_url: string | null }[];
    if (base.length) {
      const ids = base.map((c) => c.id);
      const [{ data: leccionesRaw }, { data: progresoRaw }] = await Promise.all([
        supabase.from("lecciones").select("id, curso_id, orden").in("curso_id", ids).order("orden"),
        supabase.from("progreso_lecciones").select("curso_id, leccion_id, completada").eq("alumno_id", userId).in("curso_id", ids),
      ]);
      const lecciones = (leccionesRaw as { id: string; curso_id: string; orden: number }[] | null) ?? [];
      const progreso = (progresoRaw as { curso_id: string; leccion_id: string; completada: boolean }[] | null) ?? [];
      cursos = base.map((curso) => {
        const delCurso = lecciones.filter((leccion) => leccion.curso_id === curso.id);
        const hechas = new Set(progreso.filter((item) => item.curso_id === curso.id && item.completada).map((item) => item.leccion_id));
        const siguiente = delCurso.find((leccion) => !hechas.has(leccion.id)) ?? delCurso[0];
        return {
          ...curso,
          avance: delCurso.length ? Math.round((hechas.size / delCurso.length) * 100) : 0,
          nextHref: siguiente ? `/aprender/${siguiente.id}` : `/cursos/${curso.slug}`,
        };
      });
    }
  }

  if (inscritos === 0 && completados === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div className="card animate-rise rise-2 relative overflow-hidden p-8 sm:p-11" style={{ boxShadow: "var(--shadow-md)" }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, var(--primary-dim) 0%, transparent 70%)" }} />
          <div className="relative max-w-lg">
            <span className="eyebrow inline-flex items-center gap-2" style={{ color: "var(--primary)" }}>
              <Compass className="h-4 w-4" /> Comienza aquí
            </span>
            <h2 className="mt-3 font-serif-brand tracking-tight"
              style={{ fontSize: "clamp(1.7rem,4vw,2.6rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.05 }}>
              Explora tu primer <span className="text-gradient italic">curso</span>.
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Aún no estás inscrito en ningún curso. Descubre el catálogo y empieza a aprender.
            </p>
            <Link href="/explorar" className="btn-primary group mt-7 inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-xs">
              Explorar cursos <ArrowRight className="arrow-slide h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-rise rise-1 grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Cursos activos" value={inscritos} color="var(--primary)" />
        <StatCard icon={Trophy} label="Completados" value={completados} color="var(--accent)" />
        <StatCard icon={Clock} label="En progreso" value={cursos.length} color="#d97706" />
      </div>
      <div className="animate-rise rise-2">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Continuar aprendiendo</SectionTitle>
          <Link href="/mis-cursos" className="btn-ghost rounded-xl px-4 py-2 text-xs">Ver todos</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.slice(0, 6).map((c) => (
            <Link key={c.slug} href={c.nextHref} className="card-glass group overflow-hidden">
              <div className="aspect-[16/9] w-full overflow-hidden"
                style={{ background: c.imagen_url ? undefined : "var(--surface-2)" }}>
                {c.imagen_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imagen_url} alt={c.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="line-clamp-2 text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</h4>
                  <ArrowRight className="arrow-slide h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="progress-track h-1.5 flex-1"><div className="progress-bar h-full" style={{ width: `${c.avance}%` }} /></div>
                  <span className="text-[0.68rem] font-semibold tabular-nums" style={{ color: "var(--text-faint)" }}>{c.avance}%</span>
                </div>
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
  if (!supabase) return null;

  const { data: cursosRaw } = await supabase
    .from("cursos").select("id, slug, titulo, estado").eq("profesor_id", userId)
    .order("created_at", { ascending: false });
  const cursos = (cursosRaw as Pick<Curso, "id" | "slug" | "titulo" | "estado">[] | null) ?? [];
  const ids = cursos.map((c) => c.id);

  let insc: { curso_id: string; alumno_id: string; estado: string; fecha_inscripcion: string | null }[] = [];
  let lecciones: { curso_id: string }[] = [];
  let prog: { curso_id: string; alumno_id: string; completada: boolean; ultima_vista: string | null }[] = [];
  let quizzes: { id: string; curso_id: string }[] = [];
  let intentos: { quiz_id: string; aprobado: boolean }[] = [];
  let perfiles: { id: string; nombre: string | null; apellido: string | null; email: string }[] = [];
  if (ids.length) {
    const [iR, lR, pR, qR] = await Promise.all([
      supabase.from("inscripciones").select("curso_id, alumno_id, estado, fecha_inscripcion").in("curso_id", ids),
      supabase.from("lecciones").select("curso_id").in("curso_id", ids),
      supabase.from("progreso_lecciones").select("curso_id, alumno_id, completada, ultima_vista").in("curso_id", ids),
      supabase.from("quizzes").select("id, curso_id").in("curso_id", ids),
    ]);
    insc = (iR.data as typeof insc | null) ?? [];
    lecciones = (lR.data as typeof lecciones | null) ?? [];
    prog = (pR.data as typeof prog | null) ?? [];
    quizzes = (qR.data as typeof quizzes | null) ?? [];
    if (quizzes.length) {
      const { data: intR } = await supabase.from("quiz_intentos").select("quiz_id, aprobado").in("quiz_id", quizzes.map((q) => q.id));
      intentos = (intR as typeof intentos | null) ?? [];
    }
    if (insc.length) {
      const { data: perfilesRaw } = await supabase.from("profiles").select("id, nombre, apellido, email").in("id", [...new Set(insc.map((i) => i.alumno_id))]);
      perfiles = (perfilesRaw as typeof perfiles | null) ?? [];
    }
  }

  const publicados = cursos.filter((c) => c.estado === "publicado").length;
  const finalizacion = pct(insc.filter((i) => i.estado === "completada").length, insc.length);
  const leccionesPorCurso = new Map<string, number>();
  lecciones.forEach((l) => leccionesPorCurso.set(l.curso_id, (leccionesPorCurso.get(l.curso_id) ?? 0) + 1));
  const quizToCurso = new Map(quizzes.map((q) => [q.id, q.curso_id]));

  const cursosChart = cursos.map((c) => {
    const inscritos = insc.filter((i) => i.curso_id === c.id).length;
    const cursoInt = intentos.filter((i) => quizToCurso.get(i.quiz_id) === c.id);
    return {
      curso: c.titulo.length > 16 ? c.titulo.slice(0, 15) + "…" : c.titulo,
      inscritos, aprob: pct(cursoInt.filter((i) => i.aprobado).length, cursoInt.length),
    };
  }).sort((a, b) => b.inscritos - a.inscritos);
  const actividadChart = weeklyBuckets(insc.map((i) => i.fecha_inscripcion));
  const reporteAlumnos = buildLearnerReport({ inscripciones: insc, progreso: prog, perfiles, cursos, leccionesPorCurso });

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-rise rise-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Mis cursos" value={cursos.length} color="var(--primary)" />
        <StatCard icon={Users} label="Inscritos" value={insc.length} color="#d97706" />
        <StatCard icon={GraduationCap} label="Publicados" value={publicados} color="var(--accent)" />
        <StatCard icon={TrendingUp} label="Finalización" value={`${finalizacion}%`} color="var(--primary)" />
      </div>

      {cursos.length === 0 ? (
        <p className="card animate-rise rise-2 p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Aún no tienes cursos. Crea el primero desde{" "}
          <Link href="/profesor/cursos" className="font-semibold" style={{ color: "var(--primary)" }}>gestión de cursos</Link>.
        </p>
      ) : (
        <>
          <div className="animate-rise rise-2">
            <ChartCard title="Inscripciones por semana"><ActividadArea data={actividadChart} /></ChartCard>
          </div>
          <div className="animate-rise rise-3">
            <ChartCard title="Inscritos y aprobación por curso"><CursosBar data={cursosChart} /></ChartCard>
          </div>
          <div className="animate-rise rise-4">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Mis cursos</SectionTitle>
              <Link href="/profesor/cursos" className="btn-ghost rounded-xl px-4 py-2 text-xs">Gestionar</Link>
            </div>
            <div className="card divide-y overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {cursos.map((c) => (
                <Link key={c.id} href={`/profesor/cursos/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[color:var(--surface-2)]">
                  <span className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{c.titulo}</span>
                  <span className={`${c.estado === "publicado" ? "badge-accent" : "badge"} shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold capitalize`}>
                    {c.estado}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="animate-rise rise-4">
            <LearnerReport rows={reporteAlumnos} title="Seguimiento por alumno" />
          </div>
        </>
      )}
    </div>
  );
}

/* ── SUPERVISOR ─────────────────────────────────────────── */
async function SupervisorView({ institucionId }: { institucionId: string | null }) {
  const supabase = await createClient();
  if (!institucionId) {
    return (
      <p className="card animate-rise p-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Tu cuenta de supervisor aún no está asignada a una institución. Un administrador debe asignártela.
      </p>
    );
  }
  if (!supabase) return null;

  const [{ data: instRaw }, { count: alumnosCount }, { data: cursosRaw }, { data: perfilesRaw }] = await Promise.all([
    supabase.from("instituciones").select("nombre").eq("id", institucionId).single(),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("institucion_id", institucionId).eq("rol", "alumno"),
    supabase.from("cursos").select("id, titulo, estado").eq("institucion_id", institucionId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, nombre, apellido, email").eq("institucion_id", institucionId).eq("rol", "alumno"),
  ]);
  const institucion = (instRaw as { nombre: string } | null)?.nombre ?? "tu institución";
  const alumnos = alumnosCount ?? 0;
  const cursos = (cursosRaw as Pick<Curso, "id" | "titulo" | "estado">[] | null) ?? [];
  const perfiles = (perfilesRaw as { id: string; nombre: string | null; apellido: string | null; email: string }[] | null) ?? [];
  const ids = cursos.map((c) => c.id);

  let insc: { curso_id: string; alumno_id: string; estado: string; fecha_inscripcion: string | null }[] = [];
  let lecciones: { curso_id: string }[] = [];
  let prog: { curso_id: string; alumno_id: string; completada: boolean; ultima_vista: string | null }[] = [];
  let quizzes: { id: string; curso_id: string }[] = [];
  let intentos: { quiz_id: string; aprobado: boolean }[] = [];
  if (ids.length) {
    const [iR, qR, lR, pR] = await Promise.all([
      supabase.from("inscripciones").select("curso_id, alumno_id, estado, fecha_inscripcion").in("curso_id", ids),
      supabase.from("quizzes").select("id, curso_id").in("curso_id", ids),
      supabase.from("lecciones").select("curso_id").in("curso_id", ids),
      supabase.from("progreso_lecciones").select("curso_id, alumno_id, completada, ultima_vista").in("curso_id", ids),
    ]);
    insc = (iR.data as typeof insc | null) ?? [];
    quizzes = (qR.data as typeof quizzes | null) ?? [];
    lecciones = (lR.data as typeof lecciones | null) ?? [];
    prog = (pR.data as typeof prog | null) ?? [];
    if (quizzes.length) {
      const { data: intR } = await supabase.from("quiz_intentos").select("quiz_id, aprobado").in("quiz_id", quizzes.map((q) => q.id));
      intentos = (intR as typeof intentos | null) ?? [];
    }
  }

  const finalizacion = pct(insc.filter((i) => i.estado === "completada").length, insc.length);
  const aprobacion = pct(intentos.filter((i) => i.aprobado).length, intentos.length);
  const quizToCurso = new Map(quizzes.map((q) => [q.id, q.curso_id]));
  const cursosChart = cursos.map((c) => {
    const inscritos = insc.filter((i) => i.curso_id === c.id).length;
    const cursoInt = intentos.filter((i) => quizToCurso.get(i.quiz_id) === c.id);
    return {
      curso: c.titulo.length > 16 ? c.titulo.slice(0, 15) + "…" : c.titulo,
      inscritos, aprob: pct(cursoInt.filter((i) => i.aprobado).length, cursoInt.length),
    };
  }).sort((a, b) => b.inscritos - a.inscritos);
  const actividadChart = weeklyBuckets(insc.map((i) => i.fecha_inscripcion));
  const leccionesPorCurso = new Map<string, number>();
  lecciones.forEach((leccion) => leccionesPorCurso.set(leccion.curso_id, (leccionesPorCurso.get(leccion.curso_id) ?? 0) + 1));
  const reporteAlumnos = buildLearnerReport({ inscripciones: insc, progreso: prog, perfiles, cursos, leccionesPorCurso });

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-rise rise-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Cursos" value={cursos.length} color="var(--primary)" />
        <StatCard icon={Users} label="Alumnos" value={alumnos} color="#d97706" />
        <StatCard icon={TrendingUp} label="Finalización" value={`${finalizacion}%`} color="var(--accent)" />
        <StatCard icon={GraduationCap} label="Aprobación" value={`${aprobacion}%`} color="var(--primary)" />
      </div>

      <div className="animate-rise rise-2 mb-1">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Avance de <strong style={{ color: "var(--text)" }}>{institucion}</strong>.
        </p>
      </div>

      {ids.length === 0 ? (
        <p className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Aún no hay cursos asignados a esta institución.
        </p>
      ) : (
        <>
          <div className="animate-rise rise-2">
            <ChartCard title="Inscripciones por semana"><ActividadArea data={actividadChart} /></ChartCard>
          </div>
          <div className="animate-rise rise-3">
            <ChartCard title="Inscritos y aprobación por curso"><CursosBar data={cursosChart} /></ChartCard>
          </div>
          <div className="animate-rise rise-4">
            <LearnerReport rows={reporteAlumnos} title="Seguimiento de la institución" />
          </div>
        </>
      )}
    </div>
  );
}

/* ── ADMIN ──────────────────────────────────────────────── */
function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function buildLearnerReport({
  inscripciones, progreso, perfiles, cursos, leccionesPorCurso,
}: {
  inscripciones: { curso_id: string; alumno_id: string; estado: string; fecha_inscripcion: string | null }[];
  progreso: { curso_id: string; alumno_id: string; completada: boolean; ultima_vista: string | null }[];
  perfiles: { id: string; nombre: string | null; apellido: string | null; email: string }[];
  cursos: { id: string; titulo: string }[];
  leccionesPorCurso: Map<string, number>;
}): LearnerReportRow[] {
  const profileById = new Map(perfiles.map((perfil) => [perfil.id, perfil]));
  const courseById = new Map(cursos.map((curso) => [curso.id, curso]));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return inscripciones.map((inscripcion) => {
    const perfil = profileById.get(inscripcion.alumno_id);
    const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || perfil?.email || "Alumno";
    const filas = progreso.filter((fila) => fila.alumno_id === inscripcion.alumno_id && fila.curso_id === inscripcion.curso_id);
    const avance = pct(filas.filter((fila) => fila.completada).length, leccionesPorCurso.get(inscripcion.curso_id) ?? 0);
    const fechas = [inscripcion.fecha_inscripcion, ...filas.map((fila) => fila.ultima_vista)].filter((fecha): fecha is string => Boolean(fecha));
    const ultima = fechas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const estado: LearnerReportRow["estado"] = inscripcion.estado === "completada"
      ? "Completado"
      : !ultima || new Date(ultima).getTime() < sevenDaysAgo ? "Inactivo" : "Activo";
    return {
      alumno: nombre,
      email: perfil?.email ?? "Sin email",
      curso: courseById.get(inscripcion.curso_id)?.titulo ?? "Curso",
      avance,
      estado,
      ultimaActividad: ultima ? new Date(ultima).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "Sin actividad",
    };
  }).sort((a, b) => (a.estado === "Inactivo" ? -1 : 1) - (b.estado === "Inactivo" ? -1 : 1) || a.alumno.localeCompare(b.alumno));
}

function weeklyBuckets(dates: (string | null)[], weeks = 8): { semana: string; inscripciones: number }[] {
  const MS_WEEK = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const buckets = new Array(weeks).fill(0);
  dates.forEach((d) => {
    if (!d) return;
    const wa = Math.floor((now - new Date(d).getTime()) / MS_WEEK);
    if (wa >= 0 && wa < weeks) buckets[weeks - 1 - wa]++;
  });
  return buckets.map((n, idx) => ({
    semana: new Date(now - (weeks - 1 - idx) * MS_WEEK).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
    inscripciones: n,
  }));
}

function Bar({ value, color = "var(--primary)" }: { value: number; color?: string }) {
  return (
    <div className="progress-track h-1.5 w-full">
      <div className="progress-bar h-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

async function AdminView() {
  const supabase = await createClient();

  const links = [
    { href: "/admin/cursos", icon: BookOpen, title: "Cursos", desc: "Crear, publicar y archivar cursos" },
    { href: "/admin/usuarios", icon: Users, title: "Usuarios", desc: "Roles, instituciones y accesos" },
    { href: "/admin/instituciones", icon: Inbox, title: "Instituciones", desc: "Cohortes y supervisores" },
  ];

  if (!supabase) return null;

  const [cursosR, leccionesR, inscR, progR, quizzesR, intentosR, profilesR, instR] = await Promise.all([
    supabase.from("cursos").select("id, titulo, institucion_id, estado"),
    supabase.from("lecciones").select("curso_id"),
    supabase.from("inscripciones").select("curso_id, estado, alumno_id, fecha_inscripcion"),
    supabase.from("progreso_lecciones").select("curso_id, completada"),
    supabase.from("quizzes").select("id, curso_id"),
    supabase.from("quiz_intentos").select("quiz_id, aprobado"),
    supabase.from("profiles").select("rol, institucion_id"),
    supabase.from("instituciones").select("id, nombre"),
  ]);

  const cursos = (cursosR.data as { id: string; titulo: string; institucion_id: string | null; estado: string }[] | null) ?? [];
  const lecciones = (leccionesR.data as { curso_id: string }[] | null) ?? [];
  const insc = (inscR.data as { curso_id: string; estado: string; alumno_id: string; fecha_inscripcion: string | null }[] | null) ?? [];
  const prog = (progR.data as { curso_id: string; completada: boolean }[] | null) ?? [];
  const quizzes = (quizzesR.data as { id: string; curso_id: string }[] | null) ?? [];
  const intentos = (intentosR.data as { quiz_id: string; aprobado: boolean }[] | null) ?? [];
  const profiles = (profilesR.data as { rol: string; institucion_id: string | null }[] | null) ?? [];
  const inst = (instR.data as { id: string; nombre: string }[] | null) ?? [];

  // KPIs globales
  const totalAlumnos = profiles.filter((p) => p.rol === "alumno").length;
  const totalProfes = profiles.filter((p) => p.rol === "profesor").length;
  const publicados = cursos.filter((c) => c.estado === "publicado").length;
  const finalizacion = pct(insc.filter((i) => i.estado === "completada").length, insc.length);
  const aprobacion = pct(intentos.filter((i) => i.aprobado).length, intentos.length);

  // Por curso
  const leccionesPorCurso = new Map<string, number>();
  lecciones.forEach((l) => leccionesPorCurso.set(l.curso_id, (leccionesPorCurso.get(l.curso_id) ?? 0) + 1));
  const quizToCurso = new Map(quizzes.map((q) => [q.id, q.curso_id]));

  const reporteCursos = cursos
    .map((c) => {
      const inscritos = insc.filter((i) => i.curso_id === c.id).length;
      const completadasProg = prog.filter((p) => p.curso_id === c.id && p.completada).length;
      const totalPosible = inscritos * (leccionesPorCurso.get(c.id) ?? 0);
      const avance = pct(completadasProg, totalPosible);
      const cursoIntentos = intentos.filter((i) => quizToCurso.get(i.quiz_id) === c.id);
      const aprob = pct(cursoIntentos.filter((i) => i.aprobado).length, cursoIntentos.length);
      return { id: c.id, titulo: c.titulo, estado: c.estado, inscritos, avance, aprob };
    })
    .sort((a, b) => b.inscritos - a.inscritos);

  // Datasets para los gráficos
  const rolesChart = [
    { name: "Alumnos", value: totalAlumnos },
    { name: "Profesores", value: totalProfes },
    { name: "Supervisores", value: profiles.filter((p) => p.rol === "supervisor").length },
    { name: "Admins", value: profiles.filter((p) => p.rol === "admin").length },
  ].filter((r) => r.value > 0);

  const cursosChart = reporteCursos.map((r) => ({
    curso: r.titulo.length > 16 ? r.titulo.slice(0, 15) + "…" : r.titulo,
    inscritos: r.inscritos, avance: r.avance, aprob: r.aprob,
  }));

  const WEEKS = 8;
  const MS_WEEK = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const buckets = new Array(WEEKS).fill(0);
  insc.forEach((i) => {
    if (!i.fecha_inscripcion) return;
    const wa = Math.floor((now - new Date(i.fecha_inscripcion).getTime()) / MS_WEEK);
    if (wa >= 0 && wa < WEEKS) buckets[WEEKS - 1 - wa]++;
  });
  const actividadChart = buckets.map((n, idx) => ({
    semana: new Date(now - (WEEKS - 1 - idx) * MS_WEEK).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
    inscripciones: n,
  }));

  // Por institución
  const reporteInst = inst.map((ins) => {
    const cursoIds = new Set(cursos.filter((c) => c.institucion_id === ins.id).map((c) => c.id));
    const alumnos = profiles.filter((p) => p.rol === "alumno" && p.institucion_id === ins.id).length;
    const insInst = insc.filter((i) => cursoIds.has(i.curso_id));
    const fin = pct(insInst.filter((i) => i.estado === "completada").length, insInst.length);
    return { nombre: ins.nombre, alumnos, inscripciones: insInst.length, fin };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="animate-rise rise-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Alumnos" value={totalAlumnos} color="var(--primary)" />
        <StatCard icon={GraduationCap} label="Profesores" value={totalProfes} color="var(--accent)" />
        <StatCard icon={BookOpen} label="Cursos publicados" value={publicados} color="#d97706" />
        <StatCard icon={TrendingUp} label="Finalización" value={`${finalizacion}%`} color="var(--primary)" />
      </div>

      {/* Reportes gráficos */}
      <div className="animate-rise rise-2">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: "var(--primary)" }} />
          <SectionTitle>Reportes</SectionTitle>
        </div>
        <AdminCharts roles={rolesChart} cursos={cursosChart} actividad={actividadChart} />
      </div>

      {/* Reporte por institución + Aprobación */}
      <div className="animate-rise rise-3 grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" style={{ color: "var(--primary)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Por institución</p>
          </div>
          <div className="grid gap-4">
            {reporteInst.map((r) => (
              <div key={r.nombre}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.nombre}</span>
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {r.alumnos} alumnos · {r.inscripciones} inscripciones
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Bar value={r.fin} color="var(--accent)" />
                  <span className="w-10 shrink-0 text-right text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{r.fin}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col justify-center p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Aprobación de evaluaciones</p>
          </div>
          <p className="font-serif-brand" style={{ fontSize: "2.6rem", color: "var(--text)", lineHeight: 1 }}>{aprobacion}%</p>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {intentos.filter((i) => i.aprobado).length} aprobados de {intentos.length} intentos registrados.
          </p>
        </div>
      </div>

      {/* Accesos de gestión */}
      <div className="animate-rise rise-4">
        <SectionTitle>Gestión</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="card-glass group p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))", color: "var(--primary)" }}>
                <l.icon className="h-5 w-5" />
              </span>
              <h4 className="mt-4 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {l.title} <ArrowRight className="arrow-slide h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
              </h4>
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
