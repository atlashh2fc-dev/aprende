import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { brand } from "@/lib/brand";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.name} className="h-8 w-auto" />
      ) : (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
            color: "var(--on-primary)",
            boxShadow: "0 4px 14px var(--primary-glow)",
          }}
        >
          <GraduationCap className="h-5 w-5" />
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
