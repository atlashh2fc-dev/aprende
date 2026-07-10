import { AppNav } from "@/components/AppNav";
import { initials } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNav
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
