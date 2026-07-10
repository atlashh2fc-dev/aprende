/**
 * Aprende LMS · Configuración de marca (WHITE-LABEL)
 * ──────────────────────────────────────────────────────────────
 * Este archivo es la ÚNICA fuente de verdad de la identidad visual.
 * Para revender/rebrandear la plataforma basta con:
 *   1. Cambiar los valores por defecto de abajo, o
 *   2. Definir las variables NEXT_PUBLIC_BRAND_* en el entorno
 *      (permite una marca distinta por despliegue sin tocar código).
 *
 * Los colores se inyectan como variables CSS en <html> (ver app/layout.tsx),
 * y globals.css los consume. Ningún componente hardcodea colores de marca.
 */

export type BrandMode = "dark" | "light";

export interface Brand {
  name: string;
  tagline: string;
  logoUrl: string | null;
  mode: BrandMode;
  colors: {
    /** Color principal de la marca (botones, acentos). */
    primary: string;
    primaryLight: string;
    /** Color de texto/íconos SOBRE el color primario (contraste de botones). */
    onPrimary: string;
    /** Color secundario/acento. */
    accent: string;
    /** Fondo base y superficies. */
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    /** Texto. */
    text: string;
    textMuted: string;
    textFaint: string;
  };
}

/**
 * Paleta por defecto — inspirada en Geimser (dark-tech industrial):
 * slate profundo casi negro + azul eléctrico como primario + cian de acento.
 * Cambiar estos valores (o las envs NEXT_PUBLIC_BRAND_COLOR_*) para rebrandear.
 */
const DEFAULT_BRAND: Brand = {
  name: "Aprende",
  tagline: "El centro de aprendizaje para tu comunidad",
  logoUrl: null,
  mode: "dark",
  colors: {
    primary: "#2f6bff",
    primaryLight: "#5b8cff",
    onPrimary: "#ffffff",
    accent: "#22d3ee",
    bg: "#080b12",
    surface: "#0f141f",
    surface2: "#161c2b",
    border: "rgba(255,255,255,0.08)",
    text: "#eaf0fb",
    textMuted: "rgba(234,240,251,0.64)",
    textFaint: "rgba(234,240,251,0.4)",
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
  colors: {
    ...DEFAULT_BRAND.colors,
    primary: env("NEXT_PUBLIC_BRAND_COLOR_PRIMARY") ?? DEFAULT_BRAND.colors.primary,
    accent: env("NEXT_PUBLIC_BRAND_COLOR_ACCENT") ?? DEFAULT_BRAND.colors.accent,
  },
};

/** Variables CSS derivadas de la marca, para aplicar en el elemento raíz. */
export function brandCssVars(b: Brand = brand): Record<string, string> {
  const c = b.colors;
  return {
    "--brand-primary": c.primary,
    "--brand-primary-light": c.primaryLight,
    "--brand-on-primary": c.onPrimary,
    "--brand-primary-dim": "color-mix(in srgb, " + c.primary + " 12%, transparent)",
    "--brand-primary-glow": "color-mix(in srgb, " + c.primary + " 20%, transparent)",
    "--brand-accent": c.accent,
    "--brand-bg": c.bg,
    "--brand-surface": c.surface,
    "--brand-surface-2": c.surface2,
    "--brand-border": c.border,
    "--brand-border-strong": "color-mix(in srgb, " + c.text + " 16%, transparent)",
    "--brand-text": c.text,
    "--brand-text-muted": c.textMuted,
    "--brand-text-faint": c.textFaint,
  };
}
