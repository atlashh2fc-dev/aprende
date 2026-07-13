import { AppNav } from "@/components/AppNav";
import { initials } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { readDemoRole, effectiveRole } from "@/lib/demo";

export async function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const demo = await readDemoRole();
  const viewAs = effectiveRole(user.rol, demo);
  return (
    <div className="min-h-screen">
      <AppNav
        isAdmin={user.rol === "admin"}
        viewAs={viewAs}
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
