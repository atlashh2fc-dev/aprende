import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Curso, EntregaTarea, Profile, Tarea } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "no_config" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const entregaId = new URL(request.url).searchParams.get("entregaId");
  if (!entregaId) return NextResponse.json({ error: "missing_delivery" }, { status: 400 });
  const { data: entregaRaw } = await admin
    .from("entregas_tarea")
    .select("id,tarea_id,alumno_id,archivo_path")
    .eq("id", entregaId)
    .maybeSingle();
  const entrega = entregaRaw as Pick<EntregaTarea, "id" | "tarea_id" | "alumno_id" | "archivo_path"> | null;
  if (!entrega?.archivo_path) return NextResponse.json({ error: "file_not_found" }, { status: 404 });

  const [{ data: taskRaw }, { data: profileRaw }] = await Promise.all([
    admin.from("tareas").select("curso_id").eq("id", entrega.tarea_id).single(),
    admin.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
  ]);
  const task = taskRaw as Pick<Tarea, "curso_id"> | null;
  const profile = profileRaw as Pick<Profile, "rol"> | null;
  const { data: courseRaw } = task
    ? await admin.from("cursos").select("profesor_id").eq("id", task.curso_id).single()
    : { data: null };
  const course = courseRaw as Pick<Curso, "profesor_id"> | null;
  const allowed = entrega.alumno_id === user.id || profile?.rol === "admin" || course?.profesor_id === user.id;
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await admin.storage.from("entregas").createSignedUrl(entrega.archivo_path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "file_unavailable" }, { status: 404 });
  return NextResponse.json({ url: data.signedUrl });
}
