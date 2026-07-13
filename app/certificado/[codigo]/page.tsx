import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, BadgeCheck, ShieldCheck } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { brand } from "@/lib/brand";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Certificado" };

interface CertRow {
  codigo: string; emitido_at: string;
  profiles: { nombre: string | null; apellido: string | null; email: string } | null;
  cursos: { titulo: string; nivel: string | null; duracion_horas: number | null } | null;
}

export default async function CertificadoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data } = await admin
    .from("certificados")
    .select("codigo, emitido_at, profiles(nombre, apellido, email), cursos(titulo, nivel, duracion_horas)")
    .eq("codigo", codigo)
    .maybeSingle();
  const cert = data as unknown as CertRow | null;
  if (!cert) notFound();

  const nombre = [cert.profiles?.nombre, cert.profiles?.apellido].filter(Boolean).join(" ")
    || cert.profiles?.email?.split("@")[0] || "Alumno";
  const fecha = new Date(cert.emitido_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <style>{`@media print { .no-print { display:none !important; } body { background:#fff; } }`}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-light))", color: "var(--on-primary)" }}>
            <GraduationCap className="h-4 w-4" />
          </span>
          {brand.name}
        </Link>
        <PrintButton />
      </div>

      {/* Certificado */}
      <article className="card relative overflow-hidden p-8 text-center sm:p-14" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--primary-dim) 0%, transparent 100%)" }} />
        <div className="relative">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))", color: "var(--primary)" }}>
            <BadgeCheck className="h-7 w-7" />
          </span>
          <p className="eyebrow mt-6" style={{ color: "var(--primary)" }}>Certificado de finalización</p>
          <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>Se otorga a</p>
          <h1 className="mt-2 font-serif-brand tracking-tight"
            style={{ fontSize: "clamp(2rem,6vw,3rem)", color: "var(--text)" }}>{nombre}</h1>
          <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>por completar exitosamente el curso</p>
          <h2 className="mt-2 font-serif-brand" style={{ fontSize: "clamp(1.3rem,4vw,1.8rem)", color: "var(--text)" }}>
            {cert.cursos?.titulo}
          </h2>
          {(cert.cursos?.nivel || cert.cursos?.duracion_horas) && (
            <p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
              {[cert.cursos?.nivel, cert.cursos?.duracion_horas ? `${cert.cursos.duracion_horas} horas` : null].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="mx-auto mt-10 flex max-w-md items-end justify-between gap-6 border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <div className="text-left">
              <p className="text-[0.7rem] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Fecha</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{fecha}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.7rem] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Código</p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{cert.codigo}</p>
            </div>
          </div>
        </div>
      </article>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: "var(--text-faint)" }}>
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
        Certificado verificable · {brand.name}. Este documento acredita la finalización del curso indicado.
      </p>
    </main>
  );
}
