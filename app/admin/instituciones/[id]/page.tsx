import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, BookOpen, CheckCircle2, ClipboardList, Clock3,
  GraduationCap, Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionTitle, StatCard } from "@/components/ui/StatCard";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CursoEstado, UserRole } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type Institution = { id: string; nombre: string; slug: string; created_at: string };
type Profile = {
  id: string; email: string; nombre: string | null; apellido: string | null;
  rol: UserRole; created_at: string;
};
type Course = {
  id: string; titulo: string; slug: string; estado: CursoEstado;
  profesor_id: string | null; created_at: string;
};
type Enrollment = { alumno_id: string; curso_id: string; estado: "activa" | "completada" | "cancelada" };
type Progress = { alumno_id: string; curso_id: string; completada: boolean; ultima_vista: string | null };
type Quiz = { id: string; curso_id: string };
type QuizAttempt = { quiz_id: string };
type Certificate = { alumno_id: string; curso_id: string };

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador", profesor: "Profesor", supervisor: "Supervisor", alumno: "Alumno",
};

const STATUS_STYLE: Record<CursoEstado, { label: string; bg: string; color: string }> = {
  publicado: { label: "Publicado", bg: "var(--accent-dim)", color: "var(--accent)" },
  borrador: { label: "Borrador", bg: "var(--surface-2)", color: "var(--text-muted)" },
  archivado: { label: "Archivado", bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
};

function fullName(person: Pick<Profile, "nombre" | "apellido" | "email">) {
  return [person.nombre, person.apellido].filter(Boolean).join(" ") || person.email;
}

function dateLabel(value: string | null) {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function percentage(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

export default async function InstitucionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["admin"], `/admin/instituciones/${id}`);
  const supabase = await createClient();
  if (!supabase) notFound();

  const [institutionR, profilesR, coursesR] = await Promise.all([
    supabase.from("instituciones").select("id, nombre, slug, created_at").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, email, nombre, apellido, rol, created_at").eq("institucion_id", id).order("created_at", { ascending: true }),
    supabase.from("cursos").select("id, titulo, slug, estado, profesor_id, created_at").eq("institucion_id", id).order("created_at", { ascending: false }),
  ]);

  const institution = institutionR.data as Institution | null;
  if (!institution) notFound();
  const profiles = (profilesR.data as Profile[] | null) ?? [];
  const courses = (coursesR.data as Course[] | null) ?? [];
  const courseIds = courses.map((course) => course.id);

  let enrollments: Enrollment[] = [];
  let progress: Progress[] = [];
  let quizzes: Quiz[] = [];
  let certificates: Certificate[] = [];
  if (courseIds.length) {
    const [enrollmentsR, progressR, quizzesR, certificatesR] = await Promise.all([
      supabase.from("inscripciones").select("alumno_id, curso_id, estado").in("curso_id", courseIds),
      supabase.from("progreso_lecciones").select("alumno_id, curso_id, completada, ultima_vista").in("curso_id", courseIds),
      supabase.from("quizzes").select("id, curso_id").in("curso_id", courseIds),
      supabase.from("certificados").select("alumno_id, curso_id").in("curso_id", courseIds),
    ]);
    enrollments = (enrollmentsR.data as Enrollment[] | null) ?? [];
    progress = (progressR.data as Progress[] | null) ?? [];
    quizzes = (quizzesR.data as Quiz[] | null) ?? [];
    certificates = (certificatesR.data as Certificate[] | null) ?? [];
  }

  const quizIds = quizzes.map((quiz) => quiz.id);
  let quizAttempts: QuizAttempt[] = [];
  if (quizIds.length) {
    const { data } = await supabase.from("quiz_intentos").select("quiz_id").in("quiz_id", quizIds);
    quizAttempts = (data as QuizAttempt[] | null) ?? [];
  }

  const peopleById = new Map(profiles.map((person) => [person.id, person]));
  const students = profiles.filter((person) => person.rol === "alumno");
  const supervisors = profiles.filter((person) => person.rol === "supervisor");
  const teachers = profiles.filter((person) => person.rol === "profesor");
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.estado === "activa").length;
  const completedLessons = progress.filter((item) => item.completada).length;
  const activityDates = progress.map((item) => item.ultima_vista).filter((date): date is string => Boolean(date));
  const lastActivity = activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/admin/instituciones" className="mb-6 inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Instituciones
        </Link>

        <header className="animate-rise flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow" style={{ color: "var(--primary)" }}>Cohorte · /{institution.slug}</p>
            <SectionTitle>{institution.nombre}</SectionTitle>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Vista consolidada de personas, cursos y actividad registrada desde {dateLabel(institution.created_at)}.
            </p>
          </div>
          <Link href="/admin/usuarios" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs">
            <Users className="h-4 w-4" /> Gestionar usuarios
          </Link>
        </header>

        <section className="animate-rise rise-2 mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Cuentas asignadas" value={profiles.length} />
          <StatCard icon={GraduationCap} label="Alumnos" value={students.length} color="var(--accent)" />
          <StatCard icon={BookOpen} label="Cursos cargados" value={courses.length} color="#5b8def" />
          <StatCard icon={ClipboardList} label="Inscripciones activas" value={activeEnrollments} color="#c084fc" />
        </section>

        <section className="animate-rise rise-3 mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Cursos y participación</h2>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>Lo que está disponible para esta cohorte.</p>
              </div>
              <Link href="/admin/cursos" className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Ver cursos</Link>
            </div>
            {courses.length === 0 ? (
              <p className="px-5 py-9 text-center text-sm" style={{ color: "var(--text-muted)" }}>No hay cursos asignados a esta institución.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {courses.map((course) => {
                  const registrations = enrollments.filter((item) => item.curso_id === course.id && item.estado !== "cancelada");
                  const courseProgress = progress.filter((item) => item.curso_id === course.id);
                  const completed = courseProgress.filter((item) => item.completada).length;
                  const teacher = course.profesor_id ? peopleById.get(course.profesor_id) : null;
                  const status = STATUS_STYLE[course.estado];
                  return (
                    <Link key={course.id} href={`/admin/cursos/${course.id}`} className="group block px-5 py-4 transition-colors hover:bg-[color:var(--surface-2)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{course.titulo}</p>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                            {teacher ? `Profesor: ${fullName(teacher)}` : "Sin profesor asignado"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>{registrations.length} inscrito{registrations.length === 1 ? "" : "s"}</span>
                        <span>{completed} lecci{completed === 1 ? "ón completada" : "ones completadas"}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="card p-5">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Actividad registrada</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Indicadores de aprendizaje de esta cohorte.</p>
            <dl className="mt-5 grid gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--accent)" }} />
                <div><dt className="text-xs" style={{ color: "var(--text-muted)" }}>Lecciones completadas</dt><dd className="mt-0.5 text-lg font-bold" style={{ color: "var(--text)" }}>{completedLessons}</dd></div>
              </div>
              <div className="flex items-center gap-3">
                <ClipboardList className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <div><dt className="text-xs" style={{ color: "var(--text-muted)" }}>Intentos de quiz</dt><dd className="mt-0.5 text-lg font-bold" style={{ color: "var(--text)" }}>{quizAttempts.length}</dd></div>
              </div>
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4 w-4" style={{ color: "#c084fc" }} />
                <div><dt className="text-xs" style={{ color: "var(--text-muted)" }}>Certificados emitidos</dt><dd className="mt-0.5 text-lg font-bold" style={{ color: "var(--text)" }}>{certificates.length}</dd></div>
              </div>
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
                <div><dt className="text-xs" style={{ color: "var(--text-muted)" }}>Última actividad</dt><dd className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text)" }}>{dateLabel(lastActivity)}</dd></div>
              </div>
            </dl>
          </aside>
        </section>

        <section className="animate-rise rise-4 mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Personas registradas</h2><p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Usuarios asociados directamente a {institution.nombre}.</p></div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{teachers.length} profesor{teachers.length === 1 ? "" : "es"} · {supervisors.length} supervisor{supervisors.length === 1 ? "" : "es"}</span>
          </div>
          {profiles.length === 0 ? (
            <div className="card p-9 text-center text-sm" style={{ color: "var(--text-muted)" }}>Aún no hay personas asignadas a esta institución.</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_120px_100px_125px] gap-4 border-b px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-wider sm:grid" style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
                <span>Persona</span><span>Rol</span><span>Cursos</span><span>Progreso</span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {profiles.map((person) => {
                  const personEnrollments = enrollments.filter((item) => item.alumno_id === person.id && item.estado !== "cancelada");
                  const personProgress = progress.filter((item) => item.alumno_id === person.id);
                  const personCompleted = personProgress.filter((item) => item.completada).length;
                  const ownCourses = new Set(personProgress.map((item) => item.curso_id));
                  const courseLessonRows = progress.filter((item) => ownCourses.has(item.curso_id));
                  const recent = personProgress.map((item) => item.ultima_vista).filter((date): date is string => Boolean(date)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
                  return (
                    <div key={person.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_120px_100px_125px] sm:items-center sm:gap-4">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{fullName(person)}</p><p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>{person.email}</p></div>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_LABEL[person.rol]}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{person.rol === "alumno" ? `${personEnrollments.length} inscritos` : "—"}</span>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{person.rol === "alumno" ? <><span className="font-semibold" style={{ color: "var(--text)" }}>{percentage(personCompleted, courseLessonRows.length)}%</span><span className="ml-1.5">· {dateLabel(recent)}</span></> : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
