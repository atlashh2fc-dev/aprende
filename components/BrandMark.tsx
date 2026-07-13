import Link from "next/link";
import { brand } from "@/lib/brand";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.name} className="h-8 w-auto" />
      ) : (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold tracking-[-0.08em]"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          A
        </span>
      )}
      {!compact && (
        <span className="font-serif-brand text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          {brand.name}
        </span>
      )}
    </Link>
  );
}
