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
 * Paleta por defecto — "institución contemporánea":
 * papel cálido + azul tinta como color de acción + cobre como señal secundaria.
 * El modo oscuro conserva contraste y sobriedad, sin negro puro.
 */
const DEFAULT_BRAND: Brand = {
  name: "Atlas Aprende",
  tagline: "El centro de aprendizaje para tu comunidad",
  logoUrl: "/brand/atlas-aprende-logo-yellow.png",
  mode: "light",
  light: {
    primary: "#124E66",
    primaryLight: "#216B86",
    onPrimary: "#ffffff",
    accent: "#9A5B2B",
    bg: "#F6F5F1",
    surface: "#FFFDFC",
    surface2: "#F0EFEB",
    border: "rgba(22,37,48,0.12)",
    text: "#162530",
    textMuted: "rgba(22,37,48,0.68)",
    textFaint: "rgba(22,37,48,0.46)",
    shadow: "#162530",
  },
  dark: {
    primary: "#77B8D0",
    primaryLight: "#A0D3E4",
    onPrimary: "#102631",
    accent: "#DEA66D",
    bg: "#10191F",
    surface: "#17242C",
    surface2: "#213139",
    border: "rgba(228,238,239,0.12)",
    text: "#EEF3F1",
    textMuted: "rgba(238,243,241,0.68)",
    textFaint: "rgba(238,243,241,0.46)",
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
