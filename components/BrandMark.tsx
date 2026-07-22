import Link from "next/link";
import { brand } from "@/lib/brand";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label={brand.name}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt="" className="h-8 w-8 object-contain" />
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
        <span className="inline-flex items-baseline gap-1 whitespace-nowrap font-sans text-[0.98rem] leading-none tracking-[-0.045em] sm:text-[1.05rem]">
          <span className="font-semibold" style={{ color: "var(--text)" }}>Atlas</span>
          <span className="font-extrabold" style={{ color: "#B45309" }}>Aprende</span>
        </span>
      )}
    </Link>
  );
}
