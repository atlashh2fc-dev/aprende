"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Alterna claro/oscuro persistiendo la preferencia en localStorage. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") ?? "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      aria-label="Cambiar tema"
      className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:-translate-y-px active:scale-95"
      style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)", background: "var(--surface)", boxShadow: "var(--shadow-xs)" }}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
