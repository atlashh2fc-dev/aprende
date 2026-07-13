"use client";

/**
 * Subida de imagen de portada a Supabase Storage (bucket público "cursos").
 * Devuelve la URL pública vía onChange. También permite pegar una URL manual.
 */
import { useRef, useState } from "react";
import { Loader2, Upload, ImageOff, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } as const;

export function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Selecciona un archivo de imagen."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("La imagen supera 5 MB."); return; }
    const supabase = createClient();
    if (!supabase) { setError("Supabase no está configurado."); return; }
    setBusy(true); setError(null);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `portadas/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("cursos").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { setBusy(false); setError(upErr.message); return; }
    const { data } = supabase.storage.from("cursos").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{ background: value ? undefined : "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Portada" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange("")}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }} aria-label="Quitar imagen">
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <ImageOff className="h-6 w-6" style={{ color: "var(--text-faint)" }} />
          )}
        </div>

        <div className="grid flex-1 gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="btn-ghost inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-xs disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Subiendo…" : "Subir imagen"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <input className={inputCls} style={inputStyle} value={value}
            onChange={(e) => onChange(e.target.value)} placeholder="…o pega una URL de imagen" />
        </div>
      </div>
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
