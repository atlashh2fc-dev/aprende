"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal, TriangleAlert, Users } from "lucide-react";

export type LearnerReportRow = {
  alumno: string;
  email: string;
  curso: string;
  avance: number;
  estado: "Activo" | "Inactivo" | "Completado";
  ultimaActividad: string;
};

type StatusFilter = "Todos" | LearnerReportRow["estado"];
type SortOption = "seguimiento" | "avance-desc" | "avance-asc" | "alumno";
const PAGE_SIZE = 10;

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function LearnerReport({ rows, title = "Seguimiento de alumnos" }: { rows: LearnerReportRow[]; title?: string }) {
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("Todos");
  const [status, setStatus] = useState<StatusFilter>("Todos");
  const [sort, setSort] = useState<SortOption>("seguimiento");
  const [page, setPage] = useState(1);
  const courses = useMemo(() => [...new Set(rows.map((row) => row.curso))].sort((a, b) => a.localeCompare(b)), [rows]);
  const inactive = rows.filter((row) => row.estado === "Inactivo").length;
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return rows.filter((row) =>
      (course === "Todos" || row.curso === course)
      && (status === "Todos" || row.estado === status)
      && (!term || `${row.alumno} ${row.email} ${row.curso}`.toLocaleLowerCase().includes(term)),
    ).sort((a, b) => {
      if (sort === "avance-desc") return b.avance - a.avance || a.alumno.localeCompare(b.alumno);
      if (sort === "avance-asc") return a.avance - b.avance || a.alumno.localeCompare(b.alumno);
      if (sort === "alumno") return a.alumno.localeCompare(b.alumno);
      const urgency = (row: LearnerReportRow) => row.estado === "Inactivo" ? 0 : row.estado === "Activo" ? 1 : 2;
      return urgency(a) - urgency(b) || a.alumno.localeCompare(b.alumno);
    });
  }, [course, query, rows, sort, status]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage() { setPage(1); }

  function exportCsv() {
    const header = ["Alumno", "Email", "Curso", "Avance", "Estado", "Última actividad"];
    const body = filteredRows.map((row) => [row.alumno, row.email, row.curso, `${row.avance}%`, row.estado, row.ultimaActividad]);
    const csv = [header, ...body].map((line) => line.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-aprendizaje.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><Users className="h-4 w-4" style={{ color: "var(--primary)" }} /> {title}</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{rows.length} inscripciones {inactive > 0 ? `· ${inactive} requieren seguimiento` : "· sin alertas de inactividad"}</p>
        </div>
        <button onClick={exportCsv} disabled={!filteredRows.length} className="btn-ghost inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Exportar CSV</button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Aún no hay alumnos inscritos.</p>
      ) : (
        <>
          <div className="grid gap-3 border-b px-5 py-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.6fr)_minmax(9rem,0.5fr)_minmax(10rem,0.5fr)]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-faint)" }} /><input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="Buscar alumno, email o curso…" className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} /></label>
            <select aria-label="Filtrar por curso" value={course} onChange={(event) => { setCourse(event.target.value); resetPage(); }} className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}><option>Todos</option>{courses.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Filtrar por estado" value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); resetPage(); }} className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}><option>Todos</option><option>Inactivo</option><option>Activo</option><option>Completado</option></select>
            <label className="flex items-center gap-2 rounded-xl px-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-faint)" }}><SlidersHorizontal className="h-4 w-4" /><select aria-label="Ordenar resultados" value={sort} onChange={(event) => { setSort(event.target.value as SortOption); resetPage(); }} className="w-full bg-transparent py-2.5 text-sm outline-none" style={{ color: "var(--text)" }}><option value="seguimiento">Prioridad de seguimiento</option><option value="avance-desc">Mayor avance</option><option value="avance-asc">Menor avance</option><option value="alumno">Nombre A–Z</option></select></label>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs" style={{ color: "var(--text-faint)" }}><span>{filteredRows.length === rows.length ? `${rows.length} resultados` : `${filteredRows.length} de ${rows.length} resultados`}</span>{(query || course !== "Todos" || status !== "Todos") && <button onClick={() => { setQuery(""); setCourse("Todos"); setStatus("Todos"); resetPage(); }} className="font-semibold" style={{ color: "var(--primary)" }}>Limpiar filtros</button>}</div>
          {visibleRows.length === 0 ? <p className="border-t px-5 py-10 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>No encontramos alumnos con esos filtros.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}><tr className="text-[0.68rem] font-bold uppercase tracking-wider"><th className="px-5 py-3">Alumno</th><th className="px-4 py-3">Curso</th><th className="px-4 py-3">Avance</th><th className="px-4 py-3">Actividad</th><th className="px-5 py-3">Estado</th></tr></thead><tbody className="divide-y" style={{ borderColor: "var(--border)" }}>{visibleRows.map((row) => <tr key={`${row.email}-${row.curso}`}><td className="px-5 py-3.5"><p className="font-medium" style={{ color: "var(--text)" }}>{row.alumno}</p><p className="text-xs" style={{ color: "var(--text-faint)" }}>{row.email}</p></td><td className="max-w-52 truncate px-4 py-3.5" style={{ color: "var(--text-muted)" }}>{row.curso}</td><td className="min-w-32 px-4 py-3.5"><div className="flex items-center gap-2"><div className="progress-track h-1.5 flex-1"><div className="progress-bar h-full" style={{ width: `${row.avance}%` }} /></div><span className="w-8 text-right text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>{row.avance}%</span></div></td><td className="whitespace-nowrap px-4 py-3.5 text-xs" style={{ color: "var(--text-faint)" }}>{row.ultimaActividad}</td><td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: row.estado === "Inactivo" ? "#d97706" : row.estado === "Completado" ? "var(--accent)" : "var(--primary)" }}>{row.estado === "Inactivo" && <TriangleAlert className="h-3.5 w-3.5" />}{row.estado}</span></td></tr>)}</tbody></table></div>}
          {filteredRows.length > PAGE_SIZE && <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: "var(--border)" }}><span className="text-xs" style={{ color: "var(--text-faint)" }}>Página {currentPage} de {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="btn-ghost rounded-lg p-2 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="btn-ghost rounded-lg p-2 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button></div></div>}
        </>
      )}
    </section>
  );
}
