import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite body > 10MB na rota /api/upload (vídeos etc). Default é 10MB.
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
