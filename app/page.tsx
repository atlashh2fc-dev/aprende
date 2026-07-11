import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, PlayCircle, FileText, HelpCircle, Presentation,
  CheckCircle2, Users, Palette, GraduationCap,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Home público solo para visitantes sin sesión.
  const supabase = await createClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn-primary rounded-xl px-6 py-2.5 text-xs">
            Entrar
          </Link>
        </div>
      </header>

      {/* ── Hero editorial: copy a la izquierda, producto a la derecha ── */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-8 sm:pt-16 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise">
            <div className="flex items-center gap-4">
              <span className="h-px w-10" style={{ background: "var(--primary)" }} />
              <span className="eyebrow" style={{ color: "var(--primary)" }}>
                Plataforma de aprendizaje
              </span>
            </div>
            <h1 className="mt-6 font-serif-brand"
              style={{ fontSize: "clamp(2.7rem, 5.6vw, 4.2rem)", fontWeight: 600, lineHeight: 1.02, color: "var(--text)", letterSpacing: "-0.025em" }}>
              La formación de tu organización,
              <br />
              <em className="text-gradient">sin fricción</em>.
            </h1>
            <p className="mt-7 max-w-md text-[1.05rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {brand.name} reúne cursos en video, documentos, presentaciones y
              evaluaciones en un solo flujo — con vistas dedicadas para alumnos,
              profesores, supervisores y administración.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link href="/login"
                className="btn-primary group inline-flex items-center gap-2.5 rounded-xl px-7 py-4 text-sm">
                Comenzar ahora <ArrowRight className="arrow-slide h-4 w-4" />
              </Link>
              <a href="#plataforma"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: "var(--text)" }}>
                Ver la plataforma
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
            <dl className="mt-12 flex gap-10 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              {[
                ["4", "roles con vista propia"],
                ["5+", "formatos de contenido"],
                ["100%", "marca propia"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-serif-brand text-2xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>{v}</dt>
                  <dd className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Mockup del producto construido en CSS (no imagen) */}
          <div className="animate-rise rise-2 relative hidden select-none sm:block" aria-hidden="true">
            <div className="pointer-events-none absolute -inset-10 rounded-full"
              style={{ background: "radial-gradient(closest-side, var(--primary-dim) 0%, transparent 100%)" }} />

            {/* Ventana principal: curso en progreso */}
            <div className="card relative overflow-hidden" style={{ boxShadow: "var(--shadow-lg)" }}>
              <div className="flex items-center gap-1.5 border-b px-5 py-3.5" style={{ borderColor: "var(--border)" }}>
                {["#f87171", "#fbbf24", "#34d399"].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: 0.85 }} />
                ))}
                <span className="ml-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                  {brand.name} · Mis cursos
                </span>
              </div>
              <div className="p-5">
                <p className="font-serif-brand text-lg font-semibold" style={{ color: "var(--text)" }}>
                  Liderazgo estratégico
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[0.7rem]" style={{ color: "var(--text-faint)" }}>
                  <span>Módulo 3 de 5</span>·<span>68% completado</span>
                </div>
                <div className="progress-track mt-3 h-1.5">
                  <div className="progress-bar h-full" style={{ width: "68%" }} />
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  {[
                    { icon: PlayCircle, t: "Delegación efectiva", meta: "Video · 14 min", done: true },
                    { icon: FileText, t: "Caso: reestructura de equipo", meta: "PDF · 8 págs", done: true },
                    { icon: Presentation, t: "Framework de decisión", meta: "Slides · 22", done: false },
                    { icon: HelpCircle, t: "Evaluación del módulo", meta: "Quiz · 10 preguntas", done: false },
                  ].map((l) => (
                    <div key={l.t} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                      style={{ background: "var(--surface-2)" }}>
                      <l.icon className="h-4 w-4 shrink-0" style={{ color: l.done ? "var(--text-faint)" : "var(--primary)" }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.8rem] font-medium"
                          style={{ color: l.done ? "var(--text-faint)" : "var(--text)", textDecoration: l.done ? "line-through" : "none" }}>
                          {l.t}
                        </p>
                        <p className="text-[0.65rem]" style={{ color: "var(--text-faint)" }}>{l.meta}</p>
                      </div>
                      {l.done && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Flotante: resultado de quiz */}
            <div className="card absolute -right-6 -top-6 w-40 rotate-2 p-4 text-center transition-transform duration-500 hover:rotate-0"
              style={{ boxShadow: "var(--shadow-lg)" }}>
              <p className="font-serif-brand text-3xl font-bold tabular-nums" style={{ color: "var(--text)" }}>92%</p>
              <p className="badge-accent mx-auto mt-2 w-fit rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider">
                Aprobado
              </p>
            </div>

            {/* Flotante: alumnos activos */}
            <div className="card absolute -bottom-7 -left-7 -rotate-2 p-4 transition-transform duration-500 hover:rotate-0"
              style={{ boxShadow: "var(--shadow-lg)" }}>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["var(--primary)", "var(--accent)", "#d97706"].map((c, i) => (
                    <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full text-[0.6rem] font-bold"
                      style={{ background: `color-mix(in srgb, ${c} 18%, var(--surface))`, color: c, border: "2px solid var(--surface)" }}>
                      {["AM", "JR", "+"][i]}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>128 alumnos</p>
                  <p className="text-[0.65rem]" style={{ color: "var(--text-faint)" }}>activos esta semana</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cinta de capacidades ── */}
      <div className="border-y" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4 sm:justify-between sm:px-8">
          {["Video", "PDF", "Presentaciones", "Quizzes", "Instituciones", "White-label"].map((t) => (
            <span key={t} className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.16em]"
              style={{ color: "var(--text-faint)" }}>
              <span className="h-1 w-1 rounded-full" style={{ background: "var(--primary)" }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bento: la plataforma ── */}
      <section id="plataforma" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="eyebrow" style={{ color: "var(--primary)" }}>01 — La plataforma</span>
            <h2 className="mt-3 max-w-md font-serif-brand text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: "var(--text)", lineHeight: 1.1 }}>
              Cada formato, en su mejor forma.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            El contenido se adapta a su visor ideal: el video se reproduce, el PDF se
            lee, las slides se presentan y el quiz se califica solo.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Grande: experiencia de lección */}
          <div className="card-glass group p-8 lg:col-span-2 lg:row-span-2">
            <div className="flex h-full flex-col">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                <PlayCircle className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-serif-brand text-2xl font-semibold" style={{ color: "var(--text)" }}>
                Lecciones multi-formato
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                YouTube, Vimeo, Loom o mp4 directo; PDFs embebidos; Google Slides,
                Canva o PowerPoint. Pegas la URL y la plataforma elige el visor.
              </p>
              <div className="mt-8 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: PlayCircle, t: "Video" },
                  { icon: FileText, t: "PDF" },
                  { icon: Presentation, t: "Slides" },
                  { icon: HelpCircle, t: "Quiz" },
                ].map((f) => (
                  <div key={f.t}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl py-6 transition-transform duration-300 hover:-translate-y-1"
                    style={{ background: "var(--surface-2)" }}>
                    <f.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{f.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Evaluación */}
          <div className="card-glass p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                <HelpCircle className="h-5 w-5" />
              </span>
              <span className="font-serif-brand text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>92%</span>
            </div>
            <h3 className="mt-4 font-serif-brand text-xl font-semibold" style={{ color: "var(--text)" }}>
              Evaluación automática
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Quizzes de opción única o múltiple, con calificación instantánea y reintentos.
            </p>
          </div>

          {/* Roles */}
          <div className="card-glass p-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <Users className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-serif-brand text-xl font-semibold" style={{ color: "var(--text)" }}>
              Un rol, una vista
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Alumno", "Profesor", "Supervisor", "Admin"].map((r) => (
                <span key={r} className="chip rounded-full px-2.5 py-1 text-[0.68rem] font-semibold">{r}</span>
              ))}
            </div>
          </div>

          {/* White-label */}
          <div className="card-glass flex items-center justify-between gap-4 p-7 lg:col-span-3">
            <div className="flex items-center gap-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                <Palette className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-serif-brand text-xl font-semibold" style={{ color: "var(--text)" }}>
                  Tu marca, no la nuestra
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  Colores, logo y nombre configurables por despliegue — incluidos ambos temas.
                </p>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {["var(--primary)", "var(--primary-light)", "var(--accent)", "#d97706"].map((c) => (
                <span key={c} className="h-8 w-8 rounded-full transition-transform duration-300 hover:scale-110"
                  style={{ background: c, border: "3px solid var(--surface)", boxShadow: "var(--shadow-sm)" }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:pb-28">
        <span className="eyebrow" style={{ color: "var(--primary)" }}>02 — El flujo</span>
        <div className="mt-8 grid gap-10 sm:grid-cols-3">
          {[
            ["Publica", "El profesor arma el curso por módulos: sube video, documentos y slides, y define el quiz de cada lección."],
            ["Aprende", "El alumno avanza a su ritmo con progreso visible, evaluaciones al momento y navegación entre lecciones."],
            ["Supervisa", "Supervisores y administración siguen inscripciones y finalización por curso e institución."],
          ].map(([t, d], i) => (
            <div key={t} className="border-t pt-6" style={{ borderColor: "var(--border-strong)" }}>
              <span className="font-serif-brand text-sm italic" style={{ color: "var(--text-faint)" }}>
                0{i + 1}
              </span>
              <h3 className="mt-2 font-serif-brand text-xl font-semibold" style={{ color: "var(--text)" }}>{t}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final, sobrio ── */}
      <section className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-lg">
            <GraduationCap className="h-7 w-7" style={{ color: "var(--primary)" }} />
            <h2 className="mt-4 font-serif-brand text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: "var(--text)", lineHeight: 1.1 }}>
              Empieza con tu primer curso hoy.
            </h2>
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              Sin tarjeta, sin configuración compleja. Entra con Google y publica.
            </p>
          </div>
          <Link href="/login"
            className="btn-primary group inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-sm">
            Crear mi cuenta <ArrowRight className="arrow-slide h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm sm:flex-row sm:px-8"
          style={{ color: "var(--text-faint)" }}>
          <BrandMark compact />
          <span>© {new Date().getFullYear()} {brand.name}. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
