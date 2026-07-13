"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

export function SecureAttachmentLink({ entregaId }: { entregaId: string }) {
  const [error, setError] = useState(false);
  async function openFile() {
    setError(false);
    try { const response = await fetch(`/api/entregas/file?entregaId=${entregaId}`); const data = await response.json(); if (!response.ok || !data.url) throw new Error(); window.open(data.url, "_blank", "noopener,noreferrer"); } catch { setError(true); }
  }
  return <div className="mt-3"><button onClick={openFile} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--primary)" }}><FileText className="h-3.5 w-3.5" />Abrir archivo adjunto</button>{error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>No se pudo abrir el archivo.</p>}</div>;
}
