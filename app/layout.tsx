import type { Metadata } from "next";
import { Inter, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { brand, brandThemeCss } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Titulares: grotesca geométrica bold (identidad Geimser). Reutiliza la
// variable --font-serif para no tocar los componentes que ya la usan.
const display = Hanken_Grotesk({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.tagline,
};

/**
 * Aplica el tema guardado (localStorage) antes del primer paint
 * para evitar parpadeo al alternar claro/oscuro.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme")||"${brand.mode}";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme={brand.mode} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandThemeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${display.variable} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
