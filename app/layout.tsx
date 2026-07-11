import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { brand, brandThemeCss } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
      <body className={`${inter.variable} ${cormorant.variable} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
