import { AppNav } from "@/components/AppNav";
import { initials } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { readRolePreview } from "@/lib/role-preview";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const supabase = await createClient();
  const previewRole = await readRolePreview(user.rol);
  let unreadNotifications = 0;
  if (supabase) {
    const { count } = await supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id)
      .is("leida_at", null);
    unreadNotifications = count ?? 0;
  }
  return (
    <div className="min-h-screen">
      <AppNav
        unreadNotifications={unreadNotifications}
        previewRole={previewRole}
        user={{
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          avatar_url: user.avatar_url,
          avatar_initials: initials(user.nombre, user.apellido, user.email),
        }}
      />
      <main>{children}</main>
    </div>
  );
}
