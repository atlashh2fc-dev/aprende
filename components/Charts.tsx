"use client";

/**
 * Gráficos reutilizables (Recharts) para los dashboards. Reciben datos ya
 * agregados desde Server Components. Paleta de la identidad Geimser.
 */
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";

export const CHART_COLORS = {
  primary: "#1E9FDC",
  primaryLight: "#56BCEB",
  accent: "#1FA877",
  amber: "#d97706",
  slate: "#7C8BA1",
};
const DONUT = [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.amber, CHART_COLORS.primaryLight];

const axisTick = { fontSize: 11, fill: "var(--text-faint)" } as const;
const tooltipStyle = {
  background: "var(--surface)", border: "1px solid var(--border-strong)",
  borderRadius: 12, fontSize: 12, color: "var(--text)",
} as const;

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
      {children}
    </div>
  );
}

export function RolesDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={58} outerRadius={90} paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((r, i) => (
          <span key={r.name} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT[i % DONUT.length] }} />
            {r.name} · {r.value}
          </span>
        ))}
      </div>
    </>
  );
}

export function ActividadArea({ data }: { data: { semana: string; inscripciones: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="semana" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="inscripciones" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#gArea)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CursosBar({ data }: { data: { curso: string; inscritos: number; aprob: number }[] }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="curso" tick={axisTick} tickLine={false} axisLine={false} interval={0}
            angle={-12} textAnchor="end" height={54} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="inscritos" name="Inscritos" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={34} />
          <Bar dataKey="aprob" name="Aprobación %" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.primary }} /> Inscritos</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.accent }} /> Aprobación %</span>
      </div>
    </>
  );
}
