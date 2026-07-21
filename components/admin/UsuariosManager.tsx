"use client";

/**
 * Mantenedor de usuarios (admin): buscar, filtrar por rol, cambiar rol y
 * asignar institución. Escribe a `profiles` con RLS de admin (is_admin()).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL } from "@/lib/roles";
import type { UserRole } from "@/lib/supabase/database.types";

export interface UserRow {
  id: string; email: string; nombre: string | null; apellido: string | null;
  avatar_url: string | null; rol: UserRole; institucion_id: string | null; area_ids: string[];
}
export interface Inst { id: string; nombre: string }
export interface AreaOption { id: string; nombre: string; institucion_id: string; tipo: string }

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

export function UsuariosManager({ users: initial, instituciones, areas, currentUserId }: {
  users: UserRow[]; instituciones: Inst[]; areas: AreaOption[]; currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [q, setQ] = useState("");
  const [rolFilter, setRolFilter] = useState<UserRole | "todos">("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = (() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (rolFilter !== "todos" && u.rol !== rolFilter) return false;
      if (!term) return true;
      return fullName(u).toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
    });
  })();

  async function patch(id: string, patch: Partial<Pick<UserRow, "rol" | "institucion_id">>) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", id);
    if (error) { setBusy(null); setError(error.message); return; }
    const before = users.find((user) => user.id === id);
    const validAreaIds = "institucion_id" in patch
      ? new Set(areas.filter((area) => area.institucion_id === patch.institucion_id).map((area) => area.id))
      : null;
    const remainingAreaIds = validAreaIds && before ? before.area_ids.filter((areaId) => validAreaIds.has(areaId)) : before?.area_ids;
    if (validAreaIds && before && remainingAreaIds!.length !== before.area_ids.length) {
      const { error: areasError } = await supabase.from("profile_areas").delete().eq("profile_id", id).in("area_id", before.area_ids.filter((areaId) => !validAreaIds.has(areaId)));
      if (areasError) { setBusy(null); setError(areasError.message); return; }
    }
    setBusy(null);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch, ...(remainingAreaIds ? { area_ids: remainingAreaIds } : {}) } : u)));
    router.refresh();
  }

  async function patchAreas(id: string, areaIds: string[]) {
    if (!supabase) return;
    setBusy(id); setError(null);
    const { error: removeError } = await supabase.from("profile_areas").delete().eq("profile_id", id);
    if (removeError) { setBusy(null); setError(removeError.message); return; }
    if (areaIds.length) {
      const { error: addError } = await supabase.from("profile_areas").insert(areaIds.map((area_id) => ({ profile_id: id, area_id })) as never);
      if (addError) { setBusy(null); setError(addError.message); return; }
    }
    setBusy(null);
    setUsers((prev) => prev.map((user) => user.id === id ? { ...user, area_ids: areaIds } : user));
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
        <div className="hidden grid-cols-[1fr_125px_1fr_1fr_28px] gap-4 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-wider sm:grid"
          style={{ color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}>
          <span>Usuario</span><span>Rol</span><span>Institución</span><span>Áreas / unidades</span><span />
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {filtered.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 sm:grid-cols-[1fr_125px_1fr_1fr_28px] sm:items-center sm:gap-4">
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

                <AreaPicker user={u} areas={areas.filter((area) => area.institucion_id === u.institucion_id)} disabled={busy === u.id}
                  onChange={(areaIds) => patchAreas(u.id, areaIds)} />

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
        Los cambios de rol, institución y área se aplican al instante. Al asignar un área, la persona recibe automáticamente sus capacitaciones.
      </p>
    </div>
  );
}

function AreaPicker({ user, areas, disabled, onChange }: { user: UserRow; areas: AreaOption[]; disabled: boolean; onChange: (ids: string[]) => void }) {
  const selected = areas.filter((area) => user.area_ids.includes(area.id));
  return <details className="relative"><summary className={`${selCls} block cursor-pointer list-none truncate`} style={selStyle}>{selected.length ? selected.map((area) => area.nombre).join(", ") : "— Sin áreas —"}</summary><div className="absolute right-0 z-20 mt-2 grid min-w-56 gap-2 rounded-xl p-3 shadow-lg" style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>{areas.length ? areas.map((area) => { const checked = user.area_ids.includes(area.id); return <label key={area.id} className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => onChange(checked ? user.area_ids.filter((id) => id !== area.id) : [...user.area_ids, area.id])} />{area.nombre}</label>; }) : <p className="text-xs" style={{ color: "var(--text-faint)" }}>Primero crea áreas para esta institución.</p>}</div></details>;
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
