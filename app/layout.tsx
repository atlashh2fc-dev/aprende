import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { brand, brandCssVars } from "@/lib/brand";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-mode={brand.mode}>
      <body
        className={`${inter.variable} ${cormorant.variable} min-h-screen`}
        style={brandCssVars() as CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
