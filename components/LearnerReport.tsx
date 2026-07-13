"use client";

import { Download, TriangleAlert, Users } from "lucide-react";

export type LearnerReportRow = {
  alumno: string;
  email: string;
  curso: string;
  avance: number;
  estado: "Activo" | "Inactivo" | "Completado";
  ultimaActividad: string;
};

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function LearnerReport({ rows, title = "Seguimiento de alumnos" }: { rows: LearnerReportRow[]; title?: string }) {
  const inactive = rows.filter((row) => row.estado === "Inactivo").length;

  function exportCsv() {
    const header = ["Alumno", "Email", "Curso", "Avance", "Estado", "Última actividad"];
    const body = rows.map((row) => [row.alumno, row.email, row.curso, `${row.avance}%`, row.estado, row.ultimaActividad]);
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
          <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            <Users className="h-4 w-4" style={{ color: "var(--primary)" }} /> {title}
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
            {rows.length} inscripciones {inactive > 0 ? `· ${inactive} requieren seguimiento` : "· sin alertas de inactividad"}
          </p>
        </div>
        <button onClick={exportCsv} disabled={!rows.length}
          className="btn-ghost inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs disabled:opacity-50">
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Aún no hay alumnos inscritos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>
              <tr className="text-[0.68rem] font-bold uppercase tracking-wider">
                <th className="px-5 py-3">Alumno</th><th className="px-4 py-3">Curso</th><th className="px-4 py-3">Avance</th><th className="px-4 py-3">Actividad</th><th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {rows.map((row) => (
                <tr key={`${row.email}-${row.curso}`}>
                  <td className="px-5 py-3.5"><p className="font-medium" style={{ color: "var(--text)" }}>{row.alumno}</p><p className="text-xs" style={{ color: "var(--text-faint)" }}>{row.email}</p></td>
                  <td className="max-w-52 truncate px-4 py-3.5" style={{ color: "var(--text-muted)" }}>{row.curso}</td>
                  <td className="min-w-32 px-4 py-3.5"><div className="flex items-center gap-2"><div className="progress-track h-1.5 flex-1"><div className="progress-bar h-full" style={{ width: `${row.avance}%` }} /></div><span className="w-8 text-right text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>{row.avance}%</span></div></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs" style={{ color: "var(--text-faint)" }}>{row.ultimaActividad}</td>
                  <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: row.estado === "Inactivo" ? "#d97706" : row.estado === "Completado" ? "var(--accent)" : "var(--primary)" }}>{row.estado === "Inactivo" && <TriangleAlert className="h-3.5 w-3.5" />}{row.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
