"use client";

/**
 * Mantenedor de usuarios (admin): buscar, filtrar por rol, cambiar rol y
 * asignar institución. Escribe a `profiles` con RLS de admin (is_admin()).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Search, ShieldCheck } from "lucide-react";
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
  const groups = [
    ...instituciones.map((institution) => ({
      id: institution.id,
      label: institution.nombre,
      users: filtered.filter((user) => user.institucion_id === institution.id),
    })),
    { id: "sin-institucion", label: "Sin institución", users: filtered.filter((user) => !user.institucion_id) },
  ].filter((group) => group.users.length > 0);

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

  function renderUserRow(user: UserRow) {
    const isSelf = user.id === currentUserId;
    return <div key={user.id} className="grid grid-cols-1 gap-3 border-t px-5 py-3.5 first:border-t-0 md:grid-cols-[minmax(0,1.45fr)_minmax(132px,0.8fr)_minmax(170px,1fr)_minmax(160px,1fr)_28px] md:items-center md:gap-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>{user.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(user)}</span><div className="min-w-0"><p className="flex items-center gap-1.5 truncate text-sm font-medium" style={{ color: "var(--text)" }}>{fullName(user)}{isSelf && <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>Tú</span>}</p><p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>{user.email}</p></div></div>
      <div className="flex min-w-0 items-center gap-1.5"><select className={`${selCls} min-w-0`} style={selStyle} value={user.rol} disabled={isSelf || busy === user.id} onChange={(event) => patch(user.id, { rol: event.target.value as UserRole })} title={isSelf ? "No puedes cambiar tu propio rol" : undefined}>{ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select>{user.rol === "admin" && <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />}</div>
      <select className={`${selCls} w-full`} style={selStyle} value={user.institucion_id ?? ""} disabled={busy === user.id} onChange={(event) => patch(user.id, { institucion_id: event.target.value || null })}><option value="">— Sin institución —</option>{instituciones.map((institution) => <option key={institution.id} value={institution.id}>{institution.nombre}</option>)}</select>
      <AreaPicker user={user} areas={areas.filter((area) => area.institucion_id === user.institucion_id)} disabled={busy === user.id} onChange={(areaIds) => patchAreas(user.id, areaIds)} />
      <span className="hidden justify-self-end md:block">{busy === user.id && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary)" }} />}</span>
    </div>;
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
        <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(132px,0.8fr)_minmax(170px,1fr)_minmax(160px,1fr)_28px] gap-3 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-wider md:grid"
          style={{ color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}>
          <span>Usuario</span><span>Rol</span><span>Institución</span><span>Áreas / unidades</span><span />
        </div>
        <div>
          {groups.map((group) => (
            <section key={group.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 px-5 py-2.5" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                <Building2 className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
                <p className="text-xs font-bold">{group.label}</p>
                <span className="text-[0.68rem]" style={{ color: "var(--text-faint)" }}>{group.users.length} cuenta{group.users.length === 1 ? "" : "s"}</span>
              </div>
              {group.users.map((user) => renderUserRow(user))}
            </section>
          ))}
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
  return (
    <details className="min-w-0">
      <summary className={`${selCls} flex w-full cursor-pointer list-none items-center justify-between gap-2`} style={selStyle}>
        <span className="truncate">{selected.length ? selected.map((area) => area.nombre).join(", ") : "— Sin áreas —"}</span>
        <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide" style={{ color: "var(--primary)" }}>Editar</span>
      </summary>
      <div className="mt-2 rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
        {areas.length ? (
          <div className="grid gap-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Selecciona una o más áreas</p>
            {areas.map((area) => {
              const checked = user.area_ids.includes(area.id);
              return <label key={area.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-xs transition-colors" style={{ background: checked ? "var(--primary-dim)" : "var(--surface)", color: checked ? "var(--primary)" : "var(--text-muted)" }}>
                <span className="truncate font-medium">{area.nombre}</span>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onChange(checked ? user.area_ids.filter((id) => id !== area.id) : [...user.area_ids, area.id])} />
              </label>;
            })}
          </div>
        ) : <p className="text-xs" style={{ color: "var(--text-faint)" }}>Primero crea áreas para esta institución.</p>}
      </div>
    </details>
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
