import type { LucideIcon } from "lucide-react";

export function ManagePlaceholder({ icon: Icon, eyebrow, titulo, desc, bullets }: {
  icon: LucideIcon; eyebrow: string; titulo: string; desc: string; bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
      <p className="eyebrow" style={{ color: "var(--text-faint)" }}>{eyebrow}</p>
      <h1 className="mt-1 font-serif-brand" style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 700, color: "var(--text)" }}>{titulo}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>

      <div className="mt-8 card p-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: "var(--primary-dim)", color: "var(--primary-light)" }}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Próximas funcionalidades</p>
        <ul className="mt-3 flex flex-col gap-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
