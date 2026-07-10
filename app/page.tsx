import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap, PlayCircle, ClipboardCheck, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
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

  const features = [
    { icon: PlayCircle, titulo: "Cursos y clases", desc: "Contenido en video y lecturas, organizado por módulos y a tu ritmo." },
    { icon: ClipboardCheck, titulo: "Evaluaciones", desc: "Quizzes por lección con calificación automática y seguimiento." },
    { icon: Users, titulo: "Roles y equipos", desc: "Alumnos, profesores, supervisores y administradores en un solo lugar." },
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <BrandMark />
        <Link href="/login"
          className="btn-ghost rounded-lg px-4 py-2 text-xs" >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-24 sm:px-8 sm:pt-24">
        <div className="max-w-2xl">
          <span className="eyebrow inline-flex items-center gap-2" style={{ color: "var(--primary-light)" }}>
            <GraduationCap className="h-4 w-4" /> {brand.name}
          </span>
          <h1 className="mt-5 font-serif-brand"
            style={{ fontSize: "clamp(2.6rem, 7vw, 4.6rem)", fontWeight: 700, lineHeight: 1.0, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Un centro de aprendizaje{" "}
            <span className="text-gradient italic">a tu medida</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {brand.tagline}. Publica cursos, evalúa con quizzes y gestiona alumnos,
            profesores y equipos — todo en una plataforma lista para tu marca.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login"
              className="btn-primary inline-flex items-center gap-2.5 rounded-lg px-7 py-3.5 text-xs">
              Comenzar ahora <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features"
              className="btn-ghost inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-xs">
              Ver más
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 pb-28 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.titulo} className="card p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "var(--primary-dim)", color: "var(--primary-light)" }}>
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-serif-brand text-xl font-semibold" style={{ color: "var(--text)" }}>{f.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
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
