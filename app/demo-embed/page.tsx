"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

export default function DemoEmbedPage() {
  const [message, setMessage] = useState("Validando acceso comercial…");

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
    if (!ticket) { setMessage("El acceso demo no es válido."); return; }

    void fetch("/api/demo-access", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
    }).then(async (response) => {
      const payload = await response.json() as { redirect?: string; error?: string };
      if (!response.ok || !payload.redirect) throw new Error(payload.error ?? "No fue posible iniciar la sesión demo.");
      window.location.replace(payload.redirect);
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "No fue posible iniciar la sesión demo.");
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#07101c] text-white">
      <LoaderCircle className="h-7 w-7 animate-spin text-cyan-400" />
      <strong className="text-sm">Abriendo Aprende</strong>
      <span className="text-xs text-white/40">{message}</span>
    </main>
  );
}
