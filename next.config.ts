import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite redirigir la salida de build (útil en CI/sandboxes).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Storage de Supabase: imágenes de cursos y avatares.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // Avatares de Google (SSO).
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://www.geimser.cl https://geimser.cl" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
