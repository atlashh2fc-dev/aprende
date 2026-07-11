import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export function ManagePlaceholder({ icon: Icon, eyebrow, titulo, desc, bullets }: {
  icon: LucideIcon; eyebrow: string; titulo: string; desc: string; bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="animate-rise">
        <p className="eyebrow" style={{ color: "var(--primary)" }}>{eyebrow}</p>
        <h1 className="mt-1 font-serif-brand tracking-tight"
          style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 700, color: "var(--text)" }}>
          {titulo}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>

      <div className="card animate-rise rise-2 relative mt-8 overflow-hidden p-7 sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, var(--primary-dim) 0%, transparent 70%)" }} />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <Icon className="h-5 w-5" />
          </span>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} /> Próximas funcionalidades
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {bullets.map((b) => (
              <li key={b}
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm transition-colors"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
