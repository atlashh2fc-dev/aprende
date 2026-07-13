import type { LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, label, value, color = "var(--primary)" }: {
  icon: LucideIcon; label: string; value: string | number; color?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold leading-none tabular-nums tracking-tight" style={{ color: "var(--text)" }}>
          {value}
        </p>
        <p className="mt-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-faint)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif-brand text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
      {children}
    </h2>
  );
}
