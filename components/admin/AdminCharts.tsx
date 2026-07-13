"use client";

/**
 * Gráficos del panel de administración (Recharts). Recibe datos ya agregados
 * desde el Server Component y solo renderiza. Colores de la identidad Geimser.
 */
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";

const C = {
  primary: "#1E9FDC",
  primaryLight: "#56BCEB",
  accent: "#1FA877",
  amber: "#d97706",
  slate: "#7C8BA1",
};
const ROLE_COLORS = [C.primary, C.accent, C.amber, C.primaryLight];

const axisTick = { fontSize: 11, fill: "var(--text-faint)" } as const;
const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--text)",
} as const;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
      {children}
    </div>
  );
}

export function AdminCharts({ roles, cursos, actividad }: {
  roles: { name: string; value: number }[];
  cursos: { curso: string; inscritos: number; avance: number; aprob: number }[];
  actividad: { semana: string; inscripciones: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Donut de roles */}
      <Card title="Usuarios por rol">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={roles} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={58} outerRadius={90} paddingAngle={2} strokeWidth={0}>
              {roles.map((_, i) => <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {roles.map((r, i) => (
            <span key={r.name} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
              {r.name} · {r.value}
            </span>
          ))}
        </div>
      </Card>

      {/* Inscripciones por semana */}
      <Card title="Inscripciones por semana">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={actividad} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="semana" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="inscripciones" stroke={C.primary} strokeWidth={2.5}
              fill="url(#gArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Inscritos y aprobación por curso */}
      <div className="lg:col-span-2">
        <Card title="Inscritos y aprobación por curso">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cursos} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="curso" tick={axisTick} tickLine={false} axisLine={false} interval={0}
                angle={-12} textAnchor="end" height={54} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="inscritos" name="Inscritos" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={34} />
              <Bar dataKey="aprob" name="Aprobación %" fill={C.accent} radius={[4, 4, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1 flex justify-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.primary }} /> Inscritos</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.accent }} /> Aprobación %</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
