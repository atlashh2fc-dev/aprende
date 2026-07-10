"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
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

function LoginInner() {
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><BrandMark /></div>

        <div className="card p-8" style={{ background: "var(--surface)" }}>
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "var(--primary-dim)", color: "var(--primary-light)" }}>
              <GraduationCap className="h-6 w-6" />
            </span>
            <h1 className="font-serif-brand text-2xl font-bold" style={{ color: "var(--text)" }}>
              Entra a {brand.name}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Accede con tu cuenta de Google para continuar.
            </p>
          </div>

          <button onClick={signInWithGoogle} disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "#fff", color: "#1f2937" }}>
            <GoogleIcon />
            {loading ? "Redirigiendo…" : "Continuar con Google"}
          </button>

          {error && (
            <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-xs" style={{ color: "var(--text-faint)" }}>
            Al continuar aceptas los términos y la política de privacidad.
          </p>
        </div>
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
