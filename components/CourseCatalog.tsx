"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Clock, Search, X } from "lucide-react";

export interface CatalogCourse {
  id: string;
  slug: string;
  titulo: string;
  descripcion_corta: string | null;
  imagen_url: string | null;
  nivel: string | null;
  duracion_horas: number | null;
  categoria: string | null;
}

export function CourseCatalog({ courses }: { courses: CatalogCourse[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(
    () => [...new Set(courses.map((course) => course.categoria).filter(Boolean))] as string[],
    [courses],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleCourses = courses.filter((course) => {
    const matchesCategory = !category || course.categoria === category;
    const searchable = `${course.titulo} ${course.descripcion_corta ?? ""} ${course.categoria ?? ""}`.toLocaleLowerCase("es");
    return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
        <label className="relative block max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por tema o habilidad"
            className="w-full rounded-lg py-2.5 pl-10 pr-9 text-sm outline-none transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1">
              <X className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
            </button>
          )}
        </label>
        <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
          {visibleCourses.length} {visibleCourses.length === 1 ? "curso disponible" : "cursos disponibles"}
        </span>
      </div>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar cursos por categoría">
          <button type="button" onClick={() => setCategory(null)} className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: !category ? "var(--primary)" : "var(--surface)", color: !category ? "var(--on-primary)" : "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
            Todos
          </button>
          {categories.map((item) => {
            const selected = category === item;
            return (
              <button key={item} type="button" onClick={() => setCategory(selected ? null : item)} className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: selected ? "var(--primary)" : "var(--surface)", color: selected ? "var(--on-primary)" : "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
                {item}
              </button>
            );
          })}
        </div>
      )}

      {visibleCourses.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No encontramos cursos para esa búsqueda.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory(null); }} className="mt-3 text-xs font-semibold" style={{ color: "var(--primary)" }}>
            Ver todo el catálogo
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course, index) => (
            <Link key={course.id} href={`/cursos/${course.slug}`} className={`card-glass group animate-rise rise-${(index % 5) + 1} flex flex-col overflow-hidden`}>
              <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: course.imagen_url ? undefined : "var(--surface-2)" }}>
                {course.imagen_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.imagen_url} alt={course.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                {course.categoria && <span className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--primary)" }}>{course.categoria}</span>}
                <h3 className="font-serif-brand text-lg font-semibold leading-snug" style={{ color: "var(--text)" }}>{course.titulo}</h3>
                {course.descripcion_corta && <p className="mt-2 line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{course.descripcion_corta}</p>}
                <div className="mt-auto flex items-center gap-4 border-t pt-4 text-xs" style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
                  {course.nivel && <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {course.nivel}</span>}
                  {!!course.duracion_horas && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duracion_horas} h</span>}
                  <span className="ml-auto flex items-center gap-1 font-semibold" style={{ color: "var(--primary)" }}>Ver curso <ArrowRight className="arrow-slide h-3.5 w-3.5" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
