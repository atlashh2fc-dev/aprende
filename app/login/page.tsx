"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { brand } from "@/lib/brand";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.2v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4 3.1c1-2.9 3.7-5 6.8-5z" />
    </svg>
  );
}

type Mode = "login" | "signup";

function LoginInner() {
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    login: {
      title: `Entra a ${brand.name}`,
      subtitle: "Accede con tu cuenta de Google para continuar.",
      cta: "Continuar con Google",
    },
    signup: {
      title: `Crea tu cuenta en ${brand.name}`,
      subtitle: "Regístrate con Google en segundos y empieza a aprender.",
      cta: "Registrarse con Google",
    },
  }[mode];

  async function signInWithGoogle() {
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Configura las variables de Supabase en .env.local para habilitar el acceso.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirect)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-16">
      {/* Halo decorativo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{ background: "radial-gradient(55% 90% at 50% 0%, var(--primary-dim) 0%, transparent 100%)" }} />

      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><BrandMark /></div>

        <div className="card p-8" style={{ boxShadow: "var(--shadow-lg)" }}>
          {/* Pestañas: iniciar sesión / crear cuenta */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl p-1"
            style={{ background: "var(--surface-muted, var(--surface))", border: "1px solid var(--border)" }}>
            {([["login", "Iniciar sesión"], ["signup", "Crear cuenta"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => { setMode(value); setError(null); }}
                aria-pressed={mode === value}
                className="rounded-lg px-3 py-2 text-sm font-semibold transition-all"
                style={mode === value
                  ? { background: "var(--surface)", color: "var(--text)", boxShadow: "var(--shadow-sm)" }
                  : { background: "transparent", color: "var(--text-muted)" }}>
                {label}
              </button>
            ))}
          </div>

          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))", color: "var(--primary)" }}>
              <GraduationCap className="h-6 w-6" />
            </span>
            <h1 className="font-serif-brand text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {copy.title}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {copy.subtitle}
            </p>
          </div>

          <button onClick={signInWithGoogle} disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border-strong)",
              boxShadow: "var(--shadow-sm)",
            }}>
            <GoogleIcon />
            {loading ? "Redirigiendo…" : copy.cta}
          </button>

          <p className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            {mode === "login" ? (
              <>¿No tienes cuenta?{" "}
                <button type="button" onClick={() => { setMode("signup"); setError(null); }}
                  className="font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--primary)" }}>
                  Crea una
                </button>
              </>
            ) : (
              <>¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(null); }}
                  className="font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--primary)" }}>
                  Inicia sesión
                </button>
              </>
            )}
          </p>

          {error && (
            <p className="mt-4 rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}>
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-xs" style={{ color: "var(--text-faint)" }}>
            Al continuar aceptas los términos y la política de privacidad.
          </p>
        </div>

        <Link href="/" className="mt-6 flex items-center justify-center gap-1.5 text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
