import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
  experimental: {
    // Permite body > 10MB na rota /api/upload (vídeos etc). Default é 10MB.
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
