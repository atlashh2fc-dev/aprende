"use client";

import { ContentRenderer } from "@/components/ContentRenderer";

/** @deprecated Usa ContentRenderer — se mantiene por compatibilidad. */
export function VideoPlayer({ url }: { url: string }) {
  return <ContentRenderer url={url} />;
}
