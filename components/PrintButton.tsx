"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="btn-ghost no-print inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs">
      <Printer className="h-4 w-4" /> Descargar / Imprimir
    </button>
  );
}
