"use client";

import ReactPlayer from "react-player";
import { FileText, ExternalLink, Presentation } from "lucide-react";

/**
 * Renderizador adaptable de contenido de lección.
 * Detecta el formato a partir de la URL y lo presenta con el
 * visor adecuado: video (YouTube/Vimeo/mp4...), PDF, presentaciones
 * (Google Slides, Canva, Gamma, PowerPoint online) o embed genérico.
 */

type ContentKind = "video" | "pdf" | "slides" | "embed";

function detectKind(url: string): ContentKind {
  const u = url.toLowerCase();
  if (/\.pdf($|[?#])/.test(u)) return "pdf";
  if (
    u.includes("docs.google.com/presentation") ||
    u.includes("canva.com/design") ||
    u.includes("gamma.app") ||
    u.includes("pitch.com") ||
    u.includes("slideshare") ||
    /\.(pptx?|key)($|[?#])/.test(u)
  ) return "slides";
  if (
    u.includes("youtube.com") || u.includes("youtu.be") ||
    u.includes("vimeo.com") || u.includes("wistia") ||
    u.includes("loom.com") || u.includes("mux.com") ||
    /\.(mp4|webm|m3u8|mov|ogg)($|[?#])/.test(u)
  ) return "video";
  return "embed";
}

/** Normaliza URLs de slides a su versión embebible. */
function embedUrl(url: string, kind: ContentKind): string {
  if (kind === "slides") {
    if (url.includes("docs.google.com/presentation")) {
      return url.replace(/\/(edit|pub|view).*$/, "/embed");
    }
    if (/\.pptx?($|[?#])/.test(url.toLowerCase())) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
  }
  return url;
}

function Frame({ src, title, tall = false }: { src: string; title: string; tall?: boolean }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: tall ? "4/5" : "16/9",
        maxHeight: tall ? "80vh" : undefined,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export function ContentRenderer({ url, titulo = "Contenido" }: { url: string; titulo?: string }) {
  const kind = detectKind(url);
  const src = embedUrl(url, kind);

  if (kind === "video") {
    return (
      <div className="relative overflow-hidden rounded-2xl"
        style={{ aspectRatio: "16/9", background: "#000", boxShadow: "var(--shadow-md)" }}>
        <ReactPlayer src={url} controls width="100%" height="100%" style={{ position: "absolute", inset: 0 }} />
      </div>
    );
  }

  const meta = kind === "pdf"
    ? { icon: FileText, label: "Documento PDF" }
    : kind === "slides"
      ? { icon: Presentation, label: "Presentación" }
      : { icon: ExternalLink, label: "Recurso externo" };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider">
          <meta.icon className="h-3.5 w-3.5" /> {meta.label}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
          style={{ color: "var(--primary)" }}>
          Abrir en pestaña nueva <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>
      <Frame src={src} title={titulo} tall={kind === "pdf"} />
    </div>
  );
}
