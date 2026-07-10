"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function EnrollButton({ cursoId }: { cursoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const payload = { alumno_id: user.id, curso_id: cursoId, estado: "activa" as const };
    const { error } = await supabase.from("inscripciones").insert(payload as never);
    if (error && !error.message.includes("duplicate")) { setError(error.message); setLoading(false); return; }
    router.refresh();
  }

  return (
    <div>
      <button onClick={enroll} disabled={loading}
        className="btn-primary inline-flex items-center gap-2.5 rounded-lg px-7 py-3.5 text-xs disabled:opacity-60">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {loading ? "Inscribiendo…" : "Inscribirme"}
      </button>
      {error && <p className="mt-2 text-xs" style={{ color: "#fca5a5" }}>{error}</p>}
    </div>
  );
}
