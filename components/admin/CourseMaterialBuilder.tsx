"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, Loader2, Sparkles, Trash2, Upload, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CursoMaterial } from "@/lib/supabase/database.types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/markdown", "image/jpeg", "image/png", "image/webp",
]);

function isAccepted(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_TYPES.has(file.type) || ["pdf", "doc", "docx", "ppt", "pptx", "txt", "md", "jpg", "jpeg", "png", "webp"].includes(extension ?? "");
}

function mimeFor(file: File) {
  if (ACCEPTED_TYPES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ({ pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain", md: "text/markdown", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream";
}

function displaySize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: CursoMaterial["estado"]) {
  return ({ subido: "Listo para procesar", procesando: "Procesando…", listo: "Procesado", error: "Con error" })[status];
}

export function CourseMaterialBuilder({ courseId, userId, materials, hasExistingContent }: {
  courseId: string; userId: string; materials: CursoMaterial[]; hasExistingContent: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function uploadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null); setNotice(null);
    const invalid = files.find((file) => !isAccepted(file) || file.size > MAX_FILE_BYTES);
    if (invalid) {
      setError(!isAccepted(invalid) ? `“${invalid.name}” no es un formato permitido.` : `“${invalid.name}” supera el límite de 25 MB.`);
      event.target.value = "";
      return;
    }
    const supabase = createClient();
    if (!supabase) { setError("Supabase no está configurado."); return; }
    setUploading(true);
    let uploadedCount = 0;
    try {
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "archivo";
        const path = `${userId}/${courseId}/${crypto.randomUUID()}.${extension}`;
        // Office files often have an empty browser-provided MIME type. Send the
        // normalized value so Supabase bucket MIME validation remains reliable.
        const { error: uploadError } = await supabase.storage.from("materiales-curso").upload(path, file, {
          upsert: false,
          contentType: mimeFor(file),
        });
        if (uploadError) throw new Error(uploadError.message);
        const { error: insertError } = await supabase.from("curso_materiales").insert({
          curso_id: courseId, nombre_archivo: file.name, storage_path: path, mime_type: mimeFor(file), tamanio_bytes: file.size,
        } as never);
        if (insertError) {
          await supabase.storage.from("materiales-curso").remove([path]);
          throw new Error(insertError.message);
        }
        uploadedCount += 1;
      }
      setNotice(files.length === 1 ? "Material cargado correctamente." : `${files.length} materiales cargados correctamente.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo cargar el material.";
      setError(uploadedCount > 0
        ? `Se cargaron ${uploadedCount} de ${files.length} archivos. ${message}`
        : message);
    } finally {
      setUploading(false);
      event.target.value = "";
      // Refresh after a partial batch too: successful files must be visible.
      if (uploadedCount > 0) router.refresh();
    }
  }

  async function deleteMaterial(material: CursoMaterial) {
    const supabase = createClient();
    if (!supabase) return;
    setDeleting(material.id); setError(null); setNotice(null);
    const { error: rowError } = await supabase.from("curso_materiales").delete().eq("id", material.id);
    if (rowError) { setDeleting(null); setError(rowError.message); return; }
    const { error: storageError } = await supabase.storage.from("materiales-curso").remove([material.storage_path]);
    if (storageError) setNotice("El registro fue eliminado; no se pudo eliminar el archivo privado automáticamente.");
    setDeleting(null); router.refresh();
  }

  async function generateCourse() {
    setGenerating(true); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/cursos/${courseId}/generar`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { error?: string; message?: string; modules?: number; lessons?: number };
      if (!response.ok) throw new Error(body.message ?? "No se pudo construir el curso.");
      setNotice(`Curso construido: ${body.modules} módulos y ${body.lessons} lecciones. Revísalo antes de publicarlo.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo construir el curso.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Material fuente</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Sube PDF, Word, PowerPoint, texto o imágenes. La IA leerá el material y construirá módulos, lecciones y quizzes en el formato estándar de Aprende.
          </p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || generating}
          className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs disabled:opacity-60">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Subiendo…" : "Subir material"}
        </button>
        <input ref={inputRef} onChange={uploadFiles} type="file" multiple className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp" />
      </div>

      <p className="mt-3 text-[0.68rem]" style={{ color: "var(--text-faint)" }}>Máximo 25 MB por archivo. Los documentos se almacenan de forma privada.</p>

      {materials.length > 0 && (
        <ul className="mt-5 divide-y rounded-xl border" style={{ borderColor: "var(--border)" }}>
          {materials.map((material) => {
            const Icon = material.mime_type.startsWith("image/") ? ImageIcon : FileText;
            return (
              <li key={material.id} className="flex items-center gap-3 px-3 py-3">
                <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" style={{ color: "var(--text)" }}>{material.nombre_archivo}</p>
                  <p className="mt-0.5 text-[0.68rem]" style={{ color: material.estado === "error" ? "#dc2626" : "var(--text-faint)" }}>
                    {displaySize(material.tamanio_bytes)} · {statusLabel(material.estado)}
                  </p>
                </div>
                <button type="button" onClick={() => deleteMaterial(material)} disabled={deleting === material.id || generating}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg disabled:opacity-50" style={{ color: "var(--text-faint)" }} aria-label={`Eliminar ${material.nombre_archivo}`}>
                  {deleting === material.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>{notice}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={generateCourse} disabled={!materials.length || hasExistingContent || uploading || generating}
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs disabled:opacity-60">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Construyendo curso…" : "Construir curso con IA"}
        </button>
        {hasExistingContent ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>El generador no reemplaza módulos o lecciones existentes.</span>
        ) : !materials.length ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sube al menos un material para continuar.</span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Puede tardar algunos minutos según los documentos.</span>
        )}
      </div>

      {generating && <p className="mt-3 flex items-center gap-1.5 text-[0.68rem]" style={{ color: "var(--text-faint)" }}><XCircle className="h-3.5 w-3.5" /> No cierres esta página mientras se procesa el material.</p>}
    </section>
  );
}
