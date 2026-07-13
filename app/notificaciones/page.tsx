import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NotificationsInbox, type NotificationRow } from "@/components/NotificationsInbox";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Notificacion } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/notificaciones");
  const supabase = await createClient();
  let rows: NotificationRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("notificaciones")
      .select("id, tipo, titulo, mensaje, enlace, leida_at, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);
    rows = (data as Pick<Notificacion, "id" | "tipo" | "titulo" | "mensaje" | "enlace" | "leida_at" | "created_at">[] | null) ?? [];
  }
  return <AppShell user={user}><div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12"><div className="animate-rise mb-8 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}><Bell className="h-5 w-5" /></span><div><p className="eyebrow" style={{ color: "var(--primary)" }}>Comunicaciones de curso</p><h1 className="mt-1 font-serif-brand text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Notificaciones</h1><p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Avisos publicados por tus docentes, con acceso directo a la agenda.</p></div></div><NotificationsInbox initialRows={rows} /></div></AppShell>;
}
