"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Eye } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/database.types";
import { ROLE_LABEL } from "@/lib/roles";
import { DEMO_COOKIE } from "@/lib/demo-shared";

interface NavLink { href: string; label: string; }

const LINKS_BY_ROLE: Record<UserRole, NavLink[]> = {
  alumno: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/explorar", label: "Cursos" },
    { href: "/mis-cursos", label: "Mis cursos" },
    { href: "/agenda", label: "Agenda" },
  ],
  profesor: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/profesor/cursos", label: "Mis cursos" },
    { href: "/agenda", label: "Agenda" },
    { href: "/explorar", label: "Catálogo" },
  ],
  supervisor: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/supervisor", label: "Mi institución" },
    { href: "/agenda", label: "Agenda" },
    { href: "/explorar", label: "Catálogo" },
  ],
  admin: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/admin/cursos", label: "Cursos" },
    { href: "/agenda", label: "Agenda" },
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/instituciones", label: "Instituciones" },
  ],
};

export function AppNav({ user, isAdmin = false, viewAs, unreadNotifications = 0 }: {
  user: { nombre: string | null; email: string; rol: UserRole; avatar_url: string | null; avatar_initials: string };
  isAdmin?: boolean;
  viewAs?: UserRole;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const effRole = viewAs ?? user.rol;
  const links = LINKS_BY_ROLE[effRole] ?? LINKS_BY_ROLE.alumno;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  function verComo(role: UserRole) {
    if (role === "admin") document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
    else document.cookie = `${DEMO_COOKIE}=${role}; path=/; max-age=86400`;
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        background: "color-mix(in srgb, var(--surface) 78%, transparent)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <BrandMark />
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-px"
                  style={{
                    color: active ? "var(--primary)" : "var(--text-muted)",
                    background: active ? "var(--primary-dim)" : "transparent",
                  }}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-px" style={{ background: "var(--primary)" }} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:flex"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}
              title="Ver la plataforma como otro rol (modo demo)">
              <Eye className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
              <select value={effRole} onChange={(e) => verComo(e.target.value as UserRole)}
                className="bg-transparent text-xs font-semibold outline-none" style={{ color: "var(--text)" }}>
                {(["admin", "profesor", "supervisor", "alumno"] as UserRole[]).map((r) => (
                  <option key={r} value={r}>Ver como: {ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
          )}
          <Link href="/notificaciones" title="Notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:-translate-y-px active:scale-95"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)", background: "var(--surface)", boxShadow: "var(--shadow-xs)" }}>
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.58rem] font-bold" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
          </Link>
          <ThemeToggle />
          <span className="hidden text-right sm:block">
            <span className="block text-xs font-semibold leading-tight" style={{ color: "var(--text)" }}>
              {user.nombre ?? user.email.split("@")[0]}
            </span>
            <span className="block text-[0.65rem] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              {ROLE_LABEL[effRole]}{isAdmin && viewAs && viewAs !== "admin" ? " · demo" : ""}
            </span>
          </span>
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-xl object-cover"
              style={{ border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-xs)" }} />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold"
              style={{
                background: "var(--primary-dim)",
                color: "var(--primary)",
                border: "1px solid var(--border-strong)",
              }}>
              {user.avatar_initials}
            </span>
          )}
          <button onClick={signOut} title="Salir"
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:-translate-y-px active:scale-95"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)", background: "var(--surface)", boxShadow: "var(--shadow-xs)" }}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navegación móvil */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link key={l.href} href={l.href}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                color: active ? "var(--primary)" : "var(--text-muted)",
                background: active ? "var(--primary-dim)" : "var(--surface-2)",
              }}>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
