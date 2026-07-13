"use client";

/**
 * Mantenedor de usuarios (admin): buscar, filtrar por rol, cambiar rol y
 * asignar institución. Escribe a `profiles` con RLS de admin (is_admin()).
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL } from "@/lib/roles";
import type { UserRole } from "@/lib/supabase/database.types";

export interface UserRow {
  id: string; email: string; nombre: string | null; apellido: string | null;
  avatar_url: string | null; rol: UserRole; institucion_id: string | null;
}
export interface Inst { id: string; nombre: string }

const ROLES: UserRole[] = ["alumno", "profesor", "supervisor", "admin"];
const selCls = "rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors";
const selStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;

function fullName(u: UserRow): string {
  return [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email.split("@")[0];
}
function initials(u: UserRow): string {
  const n = [u.nombre, u.apellido].filter(Boolean).map((s) => s![0]!.toUpperCase()).join("");
  return n || u.email.slice(0, 2).toUpperCase();
}

export function UsuariosManager({ users: initial, instituciones, currentUserId }: {
  users: UserRow[]; instituciones: Inst[]; currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [q, setQ] = useState("");
  const [rolFilter, setRolFilter] = useState<UserRole | "todos">("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const instName = useMemo(() => new Map(instituciones.map((i) => [i.id, i.nombre])), [instituciones]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (rolFilter !== "todos" && u.rol !== rolFilter) return false;
      if (!term) return true;
      return fullName(u).toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
    });
  }, [users, q, rolFilter]);

  async function patch(id: string, patch: Partial<Pick<UserRow, "rol" | "institucion_id">>) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    router.refresh();
  }

  const counts = ROLES.map((r) => ({ r, n: users.filter((u) => u.rol === r).length }));

  return (
    <div className="grid gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo…"
            className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={rolFilter === "todos"} onClick={() => setRolFilter("todos")} label={`Todos · ${users.length}`} />
          {counts.map(({ r, n }) => (
            <FilterChip key={r} active={rolFilter === r} onClick={() => setRolFilter(r)} label={`${ROLE_LABEL[r]} · ${n}`} />
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}>{error}</p>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[1fr_150px_1fr_28px] gap-4 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-wider sm:grid"
          style={{ color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}>
          <span>Usuario</span><span>Rol</span><span>Institución</span><span />
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {filtered.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 sm:grid-cols-[1fr_150px_1fr_28px] sm:items-center sm:gap-4">
                {/* Usuario */}
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                    style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                    {u.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      : initials(u)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                      {fullName(u)}
                      {isSelf && <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>Tú</span>}
                    </p>
                    <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>{u.email}</p>
                  </div>
                </div>

                {/* Rol */}
                <div className="flex items-center gap-2">
                  <select className={selCls} style={selStyle} value={u.rol} disabled={isSelf || busy === u.id}
                    onChange={(e) => patch(u.id, { rol: e.target.value as UserRole })}
                    title={isSelf ? "No puedes cambiar tu propio rol" : undefined}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                  {u.rol === "admin" && <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />}
                </div>

                {/* Institución */}
                <select className={`${selCls} w-full`} style={selStyle} value={u.institucion_id ?? ""} disabled={busy === u.id}
                  onChange={(e) => patch(u.id, { institucion_id: e.target.value || null })}>
                  <option value="">— Sin institución —</option>
                  {instituciones.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>

                <span className="hidden justify-self-end sm:block">
                  {busy === u.id && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary)" }} />}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Sin resultados{q ? ` para "${q}"` : ""}.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Los cambios de rol e institución se aplican al instante. {instName.size} instituciones disponibles.
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
      style={active
        ? { background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)" }
        : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
      {label}
    </button>
  );
}
