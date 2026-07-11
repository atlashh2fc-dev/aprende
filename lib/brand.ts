/**
 * Aprende LMS · Configuración de marca (WHITE-LABEL)
 * ──────────────────────────────────────────────────────────────
 * ÚNICA fuente de verdad de la identidad visual. Para rebrandear:
 *   1. Cambiar los valores por defecto de abajo, o
 *   2. Definir variables NEXT_PUBLIC_BRAND_* en el entorno.
 *
 * La plataforma tiene DOS temas (claro ejecutivo por defecto y
 * oscuro refinado opcional). Ambos se derivan de esta config y se
 * inyectan como variables CSS (ver app/layout.tsx). Ningún
 * componente hardcodea colores de marca.
 */

export type BrandMode = "light" | "dark";

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  onPrimary: string;
  accent: string;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Color base de las sombras (normalmente el tono del texto). */
  shadow: string;
}

export interface Brand {
  name: string;
  tagline: string;
  logoUrl: string | null;
  /** Tema por defecto (el usuario puede alternar). */
  mode: BrandMode;
  light: ThemeColors;
  dark: ThemeColors;
}

/**
 * Paleta por defecto — "ejecutivo moderno":
 * claro perla + índigo profundo como primario + esmeralda de acento.
 * El modo oscuro es un slate refinado (nunca negro puro).
 */
const DEFAULT_BRAND: Brand = {
  name: "Aprende",
  tagline: "El centro de aprendizaje para tu comunidad",
  logoUrl: null,
  mode: "light",
  light: {
    primary: "#4f46e5",
    primaryLight: "#6366f1",
    onPrimary: "#ffffff",
    accent: "#059669",
    bg: "#f6f7fb",
    surface: "#ffffff",
    surface2: "#eef0f7",
    border: "rgba(15,23,42,0.08)",
    text: "#0f172a",
    textMuted: "rgba(15,23,42,0.64)",
    textFaint: "rgba(15,23,42,0.42)",
    shadow: "#334155",
  },
  dark: {
    primary: "#6366f1",
    primaryLight: "#818cf8",
    onPrimary: "#ffffff",
    accent: "#34d399",
    bg: "#0f1420",
    surface: "#161c2c",
    surface2: "#1e2639",
    border: "rgba(226,232,240,0.09)",
    text: "#e8ecf7",
    textMuted: "rgba(232,236,247,0.66)",
    textFaint: "rgba(232,236,247,0.42)",
    shadow: "#000000",
  },
};

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

/** Marca resuelta: defaults + overrides desde el entorno. */
export const brand: Brand = {
  name: env("NEXT_PUBLIC_BRAND_NAME") ?? DEFAULT_BRAND.name,
  tagline: env("NEXT_PUBLIC_BRAND_TAGLINE") ?? DEFAULT_BRAND.tagline,
  logoUrl: env("NEXT_PUBLIC_BRAND_LOGO_URL") ?? DEFAULT_BRAND.logoUrl,
  mode: (env("NEXT_PUBLIC_BRAND_MODE") as BrandMode) ?? DEFAULT_BRAND.mode,
  light: {
    ...DEFAULT_BRAND.light,
    primary: env("NEXT_PUBLIC_BRAND_COLOR_PRIMARY") ?? DEFAULT_BRAND.light.primary,
    accent: env("NEXT_PUBLIC_BRAND_COLOR_ACCENT") ?? DEFAULT_BRAND.light.accent,
  },
  dark: {
    ...DEFAULT_BRAND.dark,
    primary: env("NEXT_PUBLIC_BRAND_COLOR_PRIMARY_DARK") ?? DEFAULT_BRAND.dark.primary,
    accent: env("NEXT_PUBLIC_BRAND_COLOR_ACCENT_DARK") ?? DEFAULT_BRAND.dark.accent,
  },
};

/** Bloque de variables CSS para un set de colores. */
function cssBlock(c: ThemeColors): string {
  return [
    `--brand-primary:${c.primary}`,
    `--brand-primary-light:${c.primaryLight}`,
    `--brand-on-primary:${c.onPrimary}`,
    `--brand-primary-dim:color-mix(in srgb, ${c.primary} 10%, transparent)`,
    `--brand-primary-glow:color-mix(in srgb, ${c.primary} 24%, transparent)`,
    `--brand-accent:${c.accent}`,
    `--brand-accent-dim:color-mix(in srgb, ${c.accent} 12%, transparent)`,
    `--brand-bg:${c.bg}`,
    `--brand-surface:${c.surface}`,
    `--brand-surface-2:${c.surface2}`,
    `--brand-border:${c.border}`,
    `--brand-border-strong:color-mix(in srgb, ${c.text} 16%, transparent)`,
    `--brand-text:${c.text}`,
    `--brand-text-muted:${c.textMuted}`,
    `--brand-text-faint:${c.textFaint}`,
    `--brand-shadow:${c.shadow}`,
  ].join(";");
}

/**
 * CSS completo del tema (claro + oscuro) para inyectar en <head>.
 * globals.css consume las --brand-* y las mapea a tokens semánticos.
 */
export function brandThemeCss(b: Brand = brand): string {
  return `:root{${cssBlock(b.light)}}html[data-theme="dark"]{${cssBlock(b.dark)}}`;
}
