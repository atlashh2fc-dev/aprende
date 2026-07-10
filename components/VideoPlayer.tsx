"use client";

import ReactPlayer from "react-player";

export function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16/9", background: "#000" }}>
      <ReactPlayer src={url} controls width="100%" height="100%" style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
